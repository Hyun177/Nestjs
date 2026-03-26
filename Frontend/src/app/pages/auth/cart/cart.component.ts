import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService, CartItem } from '../../../core/services/cart.service';
import { VndCurrencyPipe } from '../../../shared/pipes/vnd-currency.pipe';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { VoucherService, VoucherApplyResult } from '../../../core/services/voucher.service';
import { OrderService } from '../../../core/services/order.service';
import { LocationService, Province, Ward } from '../../../core/services/location.service';

const HCM_CODE = '12';
const SHIP_HCM = 15000;
const SHIP_OTHER = 30000;

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule,
    NzIconModule,
    NzInputNumberModule,
    NzButtonModule,
    NzSelectModule,
    VndCurrencyPipe,
    FormsModule,
    RouterLink,
  ],
  providers: [NzMessageService],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
})
export class CartComponent implements OnInit {
  private cartService = inject(CartService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);
  private voucherService = inject(VoucherService);
  private orderService = inject(OrderService);
  private locationService = inject(LocationService);
  private router = inject(Router);

  cartItems: CartItem[] = [];
  selectedItems: Set<number> = new Set<number>();
  subtotal = 0;
  discountValue = 0;
  discountPercent = 0;
  deliveryFee = 0;
  total = 0;

  provinces: Province[] = [];
  wards: Ward[] = [];
  selectedProvinceCode = '';
  selectedWardCode = '';
  loadingWards = false;

  selectedPaymentMethod = 'COD';
  paymentMethods = [
    { id: 'COD', name: 'Tiền mặt (COD)', icon: 'wallet' },
    { id: 'VNPAY', name: 'VNPAY Sandbox', icon: 'credit-card' },
    { id: 'VISA', name: 'Thẻ VISA/Mastercard', icon: 'bank' },
  ];

  voucherCode = '';
  appliedVoucher: VoucherApplyResult | null = null;
  voucherError = '';

  get hasFreeShip(): boolean {
    const selected = this.cartItems.filter(i => this.selectedItems.has(i.id));
    return selected.length > 0 && selected.every(i =>
      (i.product.labels || []).some((l: string) => l.toLowerCase().includes('freeship'))
    );
  }

  get shippingLabel(): string {
    if (this.selectedItems.size === 0) return '';
    if (this.hasFreeShip) return 'Miễn phí (FREESHIP)';
    if (!this.selectedProvinceCode) return 'Chọn địa chỉ để tính';
    return '';
  }

  ngOnInit() {
    this.locationService.getProvinces().subscribe(res => {
      this.provinces = res;
      this.cdr.markForCheck();
    });

    this.cartService.cartItems$.subscribe((items) => {
      this.cartItems = items;
      const currentItemIds = new Set(items.map((i) => i.id));
      this.selectedItems = new Set([...this.selectedItems].filter((id) => currentItemIds.has(id)));
      if (this.selectedItems.size === 0 && items.length > 0) {
        items.forEach((item) => this.selectedItems.add(item.id));
      }
      this.calculateTotals();
      this.cdr.markForCheck();
    });
    this.cartService.refreshCart();
  }

  onProvinceChange(code: string) {
    this.selectedProvinceCode = code;
    this.selectedWardCode = '';
    this.wards = [];
    if (code) {
      this.loadingWards = true;
      this.locationService.getWards(code).subscribe(res => {
        this.wards = res;
        this.loadingWards = false;
        this.cdr.markForCheck();
      });
    }
    this.calculateTotals();
  }

  onWardChange(code: string) {
    this.selectedWardCode = code;
  }

  toggleAll(checked: boolean) {
    if (checked) this.cartItems.forEach((item) => this.selectedItems.add(item.id));
    else this.selectedItems.clear();
    this.calculateTotals();
  }

  isAllSelected(): boolean {
    return this.cartItems.length > 0 && this.selectedItems.size === this.cartItems.length;
  }

  isIndeterminate(): boolean {
    return this.selectedItems.size > 0 && this.selectedItems.size < this.cartItems.length;
  }

  toggleItem(itemId: number, checked: boolean) {
    if (checked) this.selectedItems.add(itemId);
    else this.selectedItems.delete(itemId);
    this.calculateTotals();
  }

  calculateTotals() {
    const selectedCartItems = this.cartItems.filter((item) => this.selectedItems.has(item.id));

    this.subtotal = selectedCartItems.reduce((acc, item) => {
      const basePrice = item.product.originalPrice && item.product.originalPrice > item.product.price
        ? item.product.originalPrice : item.product.price;
      return acc + Number(basePrice) * item.quantity;
    }, 0);

    const saleTotal = selectedCartItems.reduce((acc, item) =>
      acc + Number(item.product.price) * item.quantity, 0);

    this.discountValue = Number((this.subtotal - saleTotal).toFixed(0));
    this.discountPercent = this.subtotal > 0 ? Math.round((this.discountValue / this.subtotal) * 100) : 0;

    if (selectedCartItems.length === 0) {
      this.deliveryFee = 0;
    } else if (this.hasFreeShip) {
      this.deliveryFee = 0;
    } else if (!this.selectedProvinceCode) {
      this.deliveryFee = 0;
    } else {
      this.deliveryFee = this.selectedProvinceCode === HCM_CODE ? SHIP_HCM : SHIP_OTHER;
    }

    let finalTotal = saleTotal + this.deliveryFee;
    if (this.appliedVoucher) {
      finalTotal = saleTotal - this.appliedVoucher.discount + this.deliveryFee;
    }
    this.total = Math.max(0, Number(finalTotal.toFixed(0)));
    this.subtotal = Number(this.subtotal.toFixed(0));
  }

  applyVoucher() {
    if (!this.voucherCode) { this.message.warning('Vui lòng nhập mã giảm giá'); return; }
    if (this.selectedItems.size === 0) { this.message.warning('Vui lòng chọn sản phẩm để áp dụng mã'); return; }

    this.voucherService.applyVoucher(this.voucherCode).subscribe({
      next: (res) => {
        this.appliedVoucher = res;
        this.voucherError = '';
        this.message.success('Đã áp dụng mã giảm giá thành công!');
        this.calculateTotals();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.appliedVoucher = null;
        this.voucherError = err.error?.message || 'Không thể áp dụng mã giảm giá này';
        this.message.error(this.voucherError);
        this.calculateTotals();
        this.cdr.markForCheck();
      },
    });
  }

  removeVoucher() {
    this.appliedVoucher = null;
    this.voucherCode = '';
    this.calculateTotals();
    this.cdr.markForCheck();
  }

  updateQuantity(item: CartItem, quantity: number) {
    if (quantity < 1) return;
    this.cartService.updateItemQuantity(item.id, quantity).subscribe({
      error: () => this.message.error('Không thể cập nhật số lượng'),
    });
  }

  removeItem(itemId: number) {
    this.cartService.removeItem(itemId).subscribe({
      next: () => {
        this.selectedItems.delete(itemId);
        this.message.success('Đã xóa sản phẩm khỏi giỏ hàng');
      },
      error: () => this.message.error('Không thể xóa sản phẩm'),
    });
  }

  checkout() {
    if (this.selectedItems.size === 0) {
      this.message.warning('Vui lòng chọn ít nhất một sản phẩm để thanh toán');
      return;
    }
    this.router.navigate(['/order-confirm'], {
      state: { itemIds: Array.from(this.selectedItems) }
    });
  }
}
