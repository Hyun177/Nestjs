import { Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { ShopService } from '../../../core/services/shop.service';
import { VndCurrencyPipe } from '../../../shared/pipes/vnd-currency.pipe';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';

@Component({
  selector: 'app-seller-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    VndCurrencyPipe,
  ],
  templateUrl: './seller-orders.component.html',
  styleUrls: ['./seller-orders.component.scss'],
})
export class SellerOrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private shopService = inject(ShopService);
  private cdr = inject(ChangeDetectorRef);
  private message = inject(NzMessageService);

  loading = signal(false);
  detailModalVisible = signal(false);
  updatingStatus = signal<number | null>(null);

  searchValue = signal('');
  statusFilter = signal('all');
  pageIndex = signal(1);
  pageSize = signal(10);
  selectedOrder = signal<any | null>(null);
  orders = signal<any[]>([]);
  sellerUserId: number | null = null;
  sellerShop: any = null;

  readonly statusOptions = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Chờ xử lý', value: 'PENDING' },
    { label: 'Đã thanh toán', value: 'PAID' },
    { label: 'Đã xác nhận', value: 'CONFIRMED' },
    { label: 'Đang xử lý', value: 'PROCESSING' },
    { label: 'Đang giao', value: 'SHIPPED' },
    { label: 'Đã giao', value: 'DELIVERED' },
    { label: 'Trả hàng', value: 'RETURNED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
  ];

  readonly statusConfig: Record<string, { color: string; label: string; bg: string }> = {
    PENDING: { color: '#f59e0b', label: 'Chờ xử lý', bg: '#fef3c7' },
    PAID: { color: '#3b82f6', label: 'Đã thanh toán', bg: '#dbeafe' },
    CONFIRMED: { color: '#6366f1', label: 'Xác nhận', bg: '#e0e7ff' },
    PROCESSING: { color: '#8b5cf6', label: 'Đang xử lý', bg: '#f3e8ff' },
    SHIPPED: { color: '#f97316', label: 'Đang giao', bg: '#ffedd5' },
    DELIVERED: { color: '#10b981', label: 'Đã giao', bg: '#d1fae5' },
    RETURNED: { color: '#64748b', label: 'Trả hàng', bg: '#f1f5f9' },
    CANCELLED: { color: '#ef4444', label: 'Đã hủy', bg: '#fee2e2' },
  };

  ngOnInit() {
    this.sellerUserId = this.authService.getUserId();
    this.loadShopAndOrders();
  }

  loadShopAndOrders() {
    if (!this.sellerUserId) return;
    this.shopService.getShopBySeller(this.sellerUserId).subscribe({
      next: (shop) => {
        this.sellerShop = shop;
        this.loadOrders();
      },
      error: () => {
        this.message.error('Không thể xác thực thông tin Shop');
        this.loadOrders();
      }
    });
  }

  getAvailableStatuses() {
    // Seller can only change the status up to CONFIRMED, or CANCEL it.
    // (PENDING, PAID, CONFIRMED, CANCELLED)
    const allowed = ['PENDING', 'PAID', 'CONFIRMED', 'CANCELLED'];
    return this.statusOptions.filter(s => allowed.includes(s.value));
  }

  loadOrders() {
    this.loading.set(true);
    this.orderService.getSellerOrders().subscribe({
      next: (res: any) => {
        const mapped = (res || []).map((o: any) => {
          const sellerItems = o.items?.filter((item: any) => {
             if (this.sellerShop?.id && item.shopId === this.sellerShop.id) return true;
             if (this.sellerShop?.id && item.product?.shopId === this.sellerShop.id) return true;
             if (this.sellerShop?.id && item.product?.shop?.id === this.sellerShop.id) return true;
             if (this.sellerUserId && item.product?.userId === this.sellerUserId) return true;
             return false;
          }) || [];
          const sellerTotal = sellerItems.reduce((acc: number, curr: any) => acc + (parseFloat(curr.price) * curr.quantity), 0);

          return {
            ...o,
            orderCode: `#${String(o.id).padStart(6, '0')}`,
            customerName: `${o.user?.firstname || ''} ${o.user?.lastname || ''}`.trim() || o.user?.name || 'Khách hàng',
            totalAmount: parseFloat(o.totalAmount || 0),
            sellerTotal: sellerTotal,
            itemsCount: sellerItems.length || 0,
            sellerItems: sellerItems
          };
        });
        this.orders.set(mapped);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  get filteredOrders() {
    const search = this.searchValue().toLowerCase();
    const status = this.statusFilter();
    return this.orders().filter(o => {
      const matchSearch = !search ||
        String(o.id).includes(search) ||
        o.customerName.toLowerCase().includes(search);
      const matchStatus = status === 'all' || o.status === status;
      return matchSearch && matchStatus;
    });
  }

  onSearch(event: any) {
    this.searchValue.set(event.target.value);
    this.pageIndex.set(1);
  }

  onStatusFilter(value: string) {
    this.statusFilter.set(value);
    this.pageIndex.set(1);
  }

  openDetail(order: any) {
    if (!this.sellerShop) {
      this.message.warning('Đang tải dữ liệu Shop, vui lòng thử lại sau');
      return;
    }
    const sellerItems = order.items?.filter((item: any) => {
       if (this.sellerShop?.id && item.shopId === this.sellerShop.id) return true;
       if (this.sellerShop?.id && item.product?.shopId === this.sellerShop.id) return true;
       if (this.sellerShop?.id && item.product?.shop?.id === this.sellerShop.id) return true;
       if (this.sellerUserId && item.product?.userId === this.sellerUserId) return true;
       return false;
    }) ?? [];
    this.selectedOrder.set({ ...order, sellerItems });
    this.detailModalVisible.set(true);
  }

  closeDetail() {
    this.detailModalVisible.set(false);
    this.selectedOrder.set(null);
  }

  updateStatus(orderId: number, event: any) {
    const newStatus = event.target.value;
    this.updatingStatus.set(orderId);
    this.orderService.updateOrderStatus(orderId, newStatus).subscribe({
      next: () => {
        this.loadOrders();
        if (this.selectedOrder()?.id === orderId) {
          this.selectedOrder.update(o => ({ ...o, status: newStatus }));
        }
        this.updatingStatus.set(null);
      },
      error: () => {
        this.updatingStatus.set(null);
      },
    });
  }

  getStatusCfg(status: string) {
    return this.statusConfig[status] || { color: '#64748b', label: status, bg: '#f1f5f9' };
  }

  getPaymentLabel(method: string): string {
    const labels: Record<string, string> = {
      'COD': 'Thanh toán khi nhận hàng (COD)',
      'VNPAY': 'Thanh toán trực tuyến (VNPAY)',
      'MOMO': 'Ví MoMo',
      'BANK': 'Chuyển khoản ngân hàng'
    };
    return labels[method] || method || 'Chưa xác định';
  }

  getProductImage(product: any): string {
    return this.getFullUrl(product?.image);
  }

  getFullUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `http://localhost:3000${cleanPath}`;
  }
}
