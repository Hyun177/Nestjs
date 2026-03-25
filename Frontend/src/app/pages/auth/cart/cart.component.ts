import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService, CartItem } from '../../../core/services/cart.service';
import { VndCurrencyPipe } from '../../../shared/pipes/vnd-currency.pipe';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { VoucherService, VoucherApplyResult } from '../../../core/services/voucher.service';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzInputNumberModule, NzButtonModule, VndCurrencyPipe, FormsModule, RouterLink],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {
  private cartService = inject(CartService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);
  private voucherService = inject(VoucherService);
  private orderService = inject(OrderService);
  private router = inject(Router);

  cartItems: CartItem[] = [];
  selectedItems: Set<number> = new Set<number>();
  subtotal = 0;
  discountValue = 0;
  discountPercent = 0;
  deliveryFee = 15000;
  total = 0;

  // Payment methods
  selectedPaymentMethod = 'COD';
  paymentMethods = [
    { id: 'COD', name: 'Tiền mặt (COD)', icon: 'wallet' },
    { id: 'VNPAY', name: 'VNPAY Sandbox', icon: 'credit-card' },
    { id: 'VISA', name: 'Thẻ VISA/Mastercard', icon: 'bank' }
  ];

  // Voucher
  voucherCode = '';
  appliedVoucher: VoucherApplyResult | null = null;
  voucherError = '';

  ngOnInit() {
    this.cartService.cartItems$.subscribe((items) => {
        this.cartItems = items;
        // Clean up selected items that no longer exist in the cart
        const currentItemIds = new Set(items.map(i => i.id));
        this.selectedItems = new Set([...this.selectedItems].filter(id => currentItemIds.has(id)));
        
        // If initially empty, select all by default
        if (this.selectedItems.size === 0 && items.length > 0) {
            items.forEach(item => this.selectedItems.add(item.id));
        }

        this.calculateTotals();
        this.cdr.markForCheck();
    });
    this.cartService.refreshCart();
  }

  toggleAll(checked: boolean) {
    if (checked) {
      this.cartItems.forEach(item => this.selectedItems.add(item.id));
    } else {
      this.selectedItems.clear();
    }
    this.calculateTotals();
  }

  isAllSelected(): boolean {
    return this.cartItems.length > 0 && this.selectedItems.size === this.cartItems.length;
  }

  isIndeterminate(): boolean {
    return this.selectedItems.size > 0 && this.selectedItems.size < this.cartItems.length;
  }

  toggleItem(itemId: number, checked: boolean) {
    if (checked) {
      this.selectedItems.add(itemId);
    } else {
      this.selectedItems.delete(itemId);
    }
    this.calculateTotals();
  }

  calculateTotals() {
    const selectedCartItems = this.cartItems.filter(item => this.selectedItems.has(item.id));

    this.subtotal = selectedCartItems.reduce((acc, item) => {
        const basePrice = (item.product.originalPrice && item.product.originalPrice > item.product.price)
            ? item.product.originalPrice 
            : item.product.price;
        return acc + (Number(basePrice) * item.quantity);
    }, 0);

    const saleTotal = selectedCartItems.reduce((acc, item) => {
        return acc + (Number(item.product.price) * item.quantity);
    }, 0);
    
    this.discountValue = this.subtotal - saleTotal;
    this.discountPercent = this.subtotal > 0 ? Math.round((this.discountValue / this.subtotal) * 100) : 0;
    this.deliveryFee = selectedCartItems.length > 0 ? 15000 : 0;
    
    let finalSaleTotal = saleTotal + this.deliveryFee;
    if (this.appliedVoucher) {
      finalSaleTotal = saleTotal - this.appliedVoucher.discount + this.deliveryFee;
    }
    
    this.total = Math.max(0, finalSaleTotal);
  }

  applyVoucher() {
    if (!this.voucherCode) {
      this.message.warning('Vui lòng nhập mã giảm giá');
      return;
    }

    if (this.selectedItems.size === 0) {
        this.message.warning('Vui lòng chọn sản phẩm để áp dụng mã');
        return;
    }

    this.voucherService.applyVoucher(this.voucherCode).subscribe({
      next: (res) => {
        this.appliedVoucher = res;
        this.voucherError = '';
        this.message.success(`Đã áp dụng mã giảm giá thành công!`);
        this.calculateTotals();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.appliedVoucher = null;
        this.voucherError = err.error?.message || 'Không thể áp dụng mã giảm giá này';
        this.message.error(this.voucherError);
        this.calculateTotals();
        this.cdr.markForCheck();
      }
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
      next: () => {},
      error: () => this.message.error('Không thể cập nhật số lượng')
    });
  }

  removeItem(itemId: number) {
    this.cartService.removeItem(itemId).subscribe({
      next: () => {
        this.selectedItems.delete(itemId);
        this.message.success('Đã xóa sản phẩm khỏi giỏ hàng');
      },
      error: () => this.message.error('Không thể xóa sản phẩm')
    });
  }

  checkout() {
    if (this.selectedItems.size === 0) {
      this.message.warning('Vui lòng chọn ít nhất một sản phẩm để thanh toán');
      return;
    }

    const method = this.selectedPaymentMethod === 'VISA' ? 'VNPAY' : this.selectedPaymentMethod;

    this.orderService.checkout({
      voucherCode: this.appliedVoucher ? this.voucherCode : undefined,
      paymentMethod: method,
      itemIds: Array.from(this.selectedItems)
    }).subscribe({
      next: (res) => {
        if (res.paymentUrl) {
          window.location.href = res.paymentUrl;
        } else {
          this.message.success(res.message || 'Đặt hàng thành công!');
          this.cartService.refreshCart();
          this.router.navigate(['/profile']);
        }
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Có lỗi xảy ra khi thanh toán');
      }
    });
  }
}
