import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService, CartItem } from '../../../core/services/cart.service';
import { VndCurrencyPipe } from '../../../shared/pipes/vnd-currency.pipe';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VoucherService, VoucherApplyResult } from '../../../core/services/voucher.service';

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

  cartItems: CartItem[] = [];
  subtotal = 0;
  discountValue = 0;
  discountPercent = 0;
  deliveryFee = 15000;
  total = 0;

  // Voucher
  voucherCode = '';
  appliedVoucher: VoucherApplyResult | null = null;
  voucherError = '';

  ngOnInit() {
    this.cartService.cartItems$.subscribe((items) => {
        this.cartItems = items;
        this.calculateTotals();
        this.cdr.markForCheck();
    });
    this.cartService.refreshCart();
  }

  calculateTotals() {
    // Subtotal tính theo giá gốc (nếu có, nếu không thì dùng giá bán)
    this.subtotal = this.cartItems.reduce((acc, item) => {
        const basePrice = (item.product.originalPrice && item.product.originalPrice > item.product.price)
            ? item.product.originalPrice 
            : item.product.price;
        return acc + (Number(basePrice) * item.quantity);
    }, 0);

    // SaleTotal là tổng giá thực tế người dùng phải trả (sau giảm giá)
    const saleTotal = this.cartItems.reduce((acc, item) => {
        return acc + (Number(item.product.price) * item.quantity);
    }, 0);
    
    // Giá trị giảm giá = Tổng giá gốc - Tổng giá bán
    this.discountValue = this.subtotal - saleTotal;
    
    // Tính % giảm giá trung bình của cả giỏ hàng (không gồm voucher)
    this.discountPercent = this.subtotal > 0 ? Math.round((this.discountValue / this.subtotal) * 100) : 0;
    
    // Phí vận chuyển (ví dụ 15k nếu có hàng, 0đ nếu trống)
    this.deliveryFee = this.cartItems.length > 0 ? 15000 : 0;
    
    // Tổng thanh toán (chưa tính voucher)
    let finalSaleTotal = saleTotal + this.deliveryFee;

    // Trừ thêm voucher (nếu có)
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
      next: () => {
        // Updated via observable
      },
      error: () => this.message.error('Không thể cập nhật số lượng')
    });
  }

  removeItem(itemId: number) {
    this.cartService.removeItem(itemId).subscribe({
      next: () => {
        this.message.success('Đã xóa sản phẩm khỏi giỏ hàng');
      },
      error: () => this.message.error('Không thể xóa sản phẩm')
    });
  }

  checkout() {
    this.message.info('Tính năng thanh toán sẽ sớm ra mắt!');
  }
}
