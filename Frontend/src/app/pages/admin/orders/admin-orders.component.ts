import { Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

import { OrderService } from '../../../core/services/order.service';
import { VndCurrencyPipe } from '../../../shared/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    VndCurrencyPipe,
  ],
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.scss'],
})
export class AdminOrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  detailLoading = signal(false);
  detailModalVisible = signal(false);
  updatingStatus = signal<number | null>(null);

  searchValue = signal('');
  statusFilter = signal('all');
  pageIndex = signal(1);
  pageSize = signal(10);
  selectedOrder = signal<any | null>(null);
  orders = signal<any[]>([]);

  readonly statusOptions = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Chờ xử lý', value: 'PENDING' },
    { label: 'Đã thanh toán', value: 'PAID' },
    { label: 'Đang giao', value: 'SHIPPED' },
    { label: 'Đã giao', value: 'DELIVERED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
  ];

  readonly statusConfig: Record<string, { color: string; label: string; step: number }> = {
    PENDING: { color: '#f59e0b', label: 'Chờ xử lý', step: 0 },
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

  ngOnInit() { this.loadOrders(); }

  loadOrders() {
    this.loading.set(true);
    this.orderService.getAllOrdersAdmin().subscribe({
      next: (res) => {
        const mapped = (res || []).map((o: any) => ({
          ...o,
          orderCode: `#${String(o.id).padStart(6, '0')}`,
          customerName: `${o.user?.firstname || ''} ${o.user?.lastname || ''}`.trim() || 'Khách vãng lai',
          customerPhone: o.user?.phone || '--',
          customerEmail: o.user?.email || '--',
          customerAvatar: o.user?.avatar ? 'http://localhost:3000' + o.user.avatar : null,
          shippingAddress: o.shippingAddress || o.user?.address || 'Chưa cập nhật',
          shippingPhone: o.shippingPhone || o.user?.phone || 'Chưa cập nhật',
          totalAmount: parseFloat(o.totalAmount || 0),
          discountAmount: parseFloat(o.discountAmount || 0),
          itemsCount: o.items?.length || 0,
        }));
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
        o.customerName.toLowerCase().includes(search) ||
        o.customerEmail.toLowerCase().includes(search);
      const matchStatus = status === 'all' || o.status === status;
      return matchSearch && matchStatus;
    });
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

  updateStatus(orderId: number, newStatus: string) {
    this.updatingStatus.set(orderId);
    this.orderService.updateOrderStatus(orderId, newStatus).subscribe({
      next: () => {
        this.message.success('Cập nhật trạng thái thành công');
        this.loadOrders();
        // Also update selected order in modal
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
}
