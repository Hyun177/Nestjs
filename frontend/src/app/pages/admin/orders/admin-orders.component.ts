import { Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';

import { OrderService } from '../../../core/services/order.service';
import { UserService } from '../../../core/services/user.service';
import { ProductService } from '../../../core/services/product.service';
import { ShopService } from '../../../core/services/shop.service';
import { VndCurrencyPipe } from '../../../shared/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzSelectModule,
    NzSpaceModule,
    NzTagModule,
    NzSpinModule,
    NzEmptyModule,
    NzDividerModule,
    NzStepsModule,
    NzTooltipModule,
    NzPopconfirmModule,
    NzInputModule,
    NzFormModule,
    VndCurrencyPipe,
  ],
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.scss'],
})
export class AdminOrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private userService = inject(UserService);
  private productService = inject(ProductService);
  private shopService = inject(ShopService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);

  loading = signal(false);
  detailLoading = signal(false);
  detailModalVisible = signal(false);
  editModalVisible = signal(false);
  isEditMode = signal(false);
  updatingStatus = signal<number | null>(null);

  searchValue = signal('');
  statusFilter = signal('all');
  shopFilter = signal<number | null>(null);
  pageIndex = signal(1);
  pageSize = signal(10);
  selectedOrder = signal<any | null>(null);
  orders = signal<any[]>([]);
  sellersList = signal<any[]>([]);

  // For Add/Edit Order
  usersList: any[] = [];
  productsList: any[] = [];
  orderForm = this.fb.group({
    id: [0],
    userId: [null as number | null, [Validators.required]],
    shippingAddress: ['', [Validators.required]],
    shippingPhone: ['', [Validators.required]],
    status: ['PENDING'],
    paymentMethod: ['COD'],
    totalAmount: [0, [Validators.required, Validators.min(0)]],
  });

  readonly statusOptions = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Chờ xử lý', value: 'PENDING' },
    { label: 'Đã xác nhận', value: 'CONFIRMED' },
    { label: 'Đã thanh toán', value: 'PAID' },
    { label: 'Đang giao', value: 'SHIPPED' },
    { label: 'Đã giao', value: 'DELIVERED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
  ];

  readonly statusConfig: Record<string, { color: string; label: string; step: number }> = {
    PENDING: { color: '#f59e0b', label: 'Chờ xử lý', step: 0 },
    CONFIRMED: { color: '#6366f1', label: 'Đã xác nhận', step: 1 },
    PAID: { color: '#3b82f6', label: 'Đã thanh toán', step: 1 },
    SHIPPED: { color: '#8b5cf6', label: 'Đang giao', step: 2 },
    DELIVERED: { color: '#10b981', label: 'Đã giao', step: 3 },
    CANCELLED: { color: '#ef4444', label: 'Đã hủy', step: -1 },
  };

  readonly paymentLabels: Record<string, string> = {
    COD: 'Thanh toán khi nhận hàng',
    VNPAY: 'VNPAY (Chuyển khoản)',
    CASH: 'Tiền mặt',
  };

  ngOnInit() { 
    this.loadOrders(); 
    this.loadUsers();
    this.loadProducts();
    this.loadSellers();
  }

  loadSellers() {
    this.userService.getAllUsers().subscribe({
      next: (data: any) => {
        const sellers = (data || [])
          .filter((u: any) => u.shop || u.roles?.some((r: any) => r.name?.toLowerCase() === 'seller'))
          .map((u: any) => ({
            id: u.shop?.id || u.id, // Store for fallback
            userId: u.id,
            displayName: u.shop?.name || (u.firstname ? `${u.firstname} ${u.lastname}`.trim() : u.email || 'Seller')
          }));
        
        const finalSellers = [
          { id: 0, userId: 0, displayName: 'Admin' },
          ...sellers
        ];
        
        this.sellersList.set(finalSellers);
      }
    });
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe(res => this.usersList = res || []);
  }

  loadProducts() {
    this.productService.getProducts({ limit: 100 }).subscribe(res => this.productsList = res || []);
  }

  loadOrders() {
    this.loading.set(true);
    this.orderService.getAllOrdersAdmin().subscribe({
      next: (res) => {
        const mapped = (res || []).map((o: any) => {
          // Use userId for sellerIds to ensure robustness even if shopId is null
          const sellerIds = Array.from(new Set((o.items || []).map((i: any) => i.product ? (i.product.userId || 0) : 0)));
          
          return {
            ...o,
            orderCode: `#${String(o.id).padStart(6, '0')}`,
            customerName: `${o.user?.firstname || ''} ${o.user?.lastname || ''}`.trim() || o.user?.name || 'Khách vãng lai',
            customerPhone: o.user?.phone || '--',
            customerEmail: o.user?.email || '--',
            customerAvatar: o.user?.avatar
              ? o.user.avatar.startsWith('http')
                ? o.user.avatar
                : 'https://nestjs-zvmg.onrender.com' + o.user.avatar
              : null,
            shippingAddress: o.shippingAddress || o.user?.address || 'Chưa cập nhật',
            shippingPhone: o.shippingPhone || o.user?.phone || 'Chưa cập nhật',
            totalAmount: parseFloat(o.totalAmount || 0),
            discountAmount: parseFloat(o.discountAmount || 0),
            itemsCount: o.items?.length || 0,
            sellerIds: sellerIds,
            items: o.items
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
    const sellerId = this.shopFilter();
    
    return this.orders().filter(o => {
      const matchSearch = !search ||
        String(o.id).includes(search) ||
        o.customerName.toLowerCase().includes(search) ||
        o.customerEmail.toLowerCase().includes(search);
      const matchStatus = status === 'all' || o.status === status;
      
      let matchSeller = true;
      if (sellerId !== null && sellerId !== undefined) {
         // sellerId drop down contains shop.id or u.id. 
         const selectedSeller = this.sellersList().find(s => s.id === sellerId);
         if (selectedSeller) {
            matchSeller = o.sellerIds?.includes(selectedSeller.userId);
         }
      }
      
      return matchSearch && matchStatus && matchSeller;
    });
  }

  onShopFilter(shopId: number | null) {
    this.shopFilter.set(shopId);
    this.pageIndex.set(1);
  }

  onSearch(value: string) { this.searchValue.set(value); this.pageIndex.set(1); }
  onStatusFilter(value: string) { this.statusFilter.set(value); this.pageIndex.set(1); }

  openDetail(order: any) {
    this.selectedOrder.set(order);
    this.detailModalVisible.set(true);
  }

  closeDetail() {
    this.detailModalVisible.set(false);
    this.selectedOrder.set(null);
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.orderForm.reset({ status: 'PENDING', paymentMethod: 'COD', totalAmount: 0 });
    this.editModalVisible.set(true);
  }

  openEditModal(order: any) {
    this.isEditMode.set(true);
    this.orderForm.patchValue({
      id: order.id,
      userId: order.userId,
      shippingAddress: order.shippingAddress,
      shippingPhone: order.shippingPhone,
      status: order.status,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
    });
    this.editModalVisible.set(true);
  }

  handleEditOk() {
    if (this.orderForm.valid) {
      const val = this.orderForm.value;
      this.loading.set(true);
      
      if (this.isEditMode()) {
        //@ts-ignore
        this.orderService.updateOrderAdmin(val.id, val).subscribe({
          next: () => {
            this.message.success('Cập nhật đơn hàng thành công');
            this.editModalVisible.set(false);
            this.loadOrders();
          },
          error: () => {
            this.message.error('Cập nhật thất bại');
            this.loading.set(false);
          }
        });
      } else {
        this.message.info('Tính năng thêm đơn hàng thủ công yêu cầu chọn sản phẩm. Vui lòng sử dụng Checkout.');
        this.loading.set(false);
      }
    }
  }

  deleteOrder(id: number) {
    this.loading.set(true);
    //@ts-ignore
    this.orderService.deleteOrderAdmin(id).subscribe({
      next: () => {
        this.message.success('Đã xóa đơn hàng');
        this.loadOrders();
      },
      error: () => {
        this.message.error('Xóa thất bại');
        this.loading.set(false);
      }
    });
  }

  updateStatus(orderId: number, newStatus: string) {
    this.updatingStatus.set(orderId);
    this.orderService.updateOrderStatus(orderId, newStatus).subscribe({
      next: () => {
        this.message.success('Cập nhật trạng thái thành công');
        this.loadOrders();
        if (this.selectedOrder()?.id === orderId) {
          this.selectedOrder.update(o => ({ ...o, status: newStatus }));
        }
        this.updatingStatus.set(null);
      },
      error: () => {
        this.message.error('Cập nhật thất bại');
        this.updatingStatus.set(null);
      },
    });
  }

  getStatusCfg(status: string) {
    return this.statusConfig[status] || { color: '#64748b', label: status, step: 0 };
  }

  getStepStatus(orderStatus: string, step: number): 'finish' | 'process' | 'wait' | 'error' {
    if (orderStatus === 'CANCELLED') return step === 0 ? 'error' : 'wait';
    const current = this.statusConfig[orderStatus]?.step ?? 0;
    if (step < current) return 'finish';
    if (step === current) return 'process';
    return 'wait';
  }

  getPaymentLabel(method: string) {
    return this.paymentLabels[method] || method;
  }

  getOrderShopNames(order: any): string {
    const names = (order.items || []).map((i: any) => {
      if (i.product?.shop?.name) return i.product.shop.name;
      if (i.product?.userId) {
        const seller = this.sellersList().find(s => s.userId === i.product.userId || s.id === i.product.userId);
        if (seller && seller.userId !== 0) return seller.displayName;
      }
      return 'Admin';
    });
    return Array.from(new Set(names)).join(', ');
  }
}
