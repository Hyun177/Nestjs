import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { CartService, CartItem } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { AddressService, UserAddress } from '../../core/services/address.service';
import { VoucherService, VoucherApplyResult } from '../../core/services/voucher.service';
import { LocationService, Province, Ward } from '../../core/services/location.service';
import { VndCurrencyPipe } from '../../shared/pipes/vnd-currency.pipe';
import { ImageUrlPipe } from '../../shared/pipes/image-url.pipe';

const HCM_CODE = '12';

@Component({
  selector: 'app-order-confirm',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzIconModule,
    NzButtonModule,
    NzModalModule,
    NzSelectModule,
    NzPopconfirmModule,
    VndCurrencyPipe,
    ImageUrlPipe,
  ],
  providers: [NzMessageService],
  templateUrl: './order-confirm.component.html',
  styleUrls: ['./order-confirm.component.scss'],
})
export class OrderConfirmComponent implements OnInit {
  private cartService = inject(CartService);
  private orderService = inject(OrderService);
  private addressService = inject(AddressService);
  private voucherService = inject(VoucherService);
  private locationService = inject(LocationService);
  private message = inject(NzMessageService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  // Cart
  cartItems: CartItem[] = [];
  selectedItemIds: number[] = [];
  selectedItems: CartItem[] = [];

  // Address
  addresses: UserAddress[] = [];
  selectedAddressId: number | null = null;
  showAddressModal = false;
  editingAddress: UserAddress | null = null;
  addressForm: UserAddress = this.emptyForm();

  // Location
  provinces: Province[] = [];
  wards: Ward[] = [];
  loadingWards = false;

  // Shipping
  shippingFee = 0;

  // Voucher
  voucherCode = '';
  appliedVoucher: VoucherApplyResult | null = null;
  myVouchers: any[] = [];
  showVoucherModal = false;

  // Payment
  selectedPaymentMethod = 'COD';
  paymentMethods = [
    { id: 'COD', name: 'Tiền mặt (COD)', icon: 'wallet', desc: 'Thanh toán khi nhận hàng' },
    { id: 'VNPAY', name: 'VNPAY', icon: 'credit-card', desc: 'Thanh toán trực tuyến an toàn' },
    { id: 'MOMO', name: 'MoMo', icon: 'bank', desc: 'Thanh toán qua cổng MoMo' },
  ];

  isPlacingOrder = false;

  get subtotal(): number {
    return this.selectedItems.reduce((acc, i) => acc + Number(i.product.price) * i.quantity, 0);
  }

  get voucherDiscount(): number {
    return this.appliedVoucher?.discount ?? 0;
  }

  get total(): number {
    return Math.max(0, this.subtotal - this.voucherDiscount + this.shippingFee);
  }

  get selectedAddress(): UserAddress | null {
    return this.addresses.find((a) => a.id === this.selectedAddressId) ?? null;
  }

  get hasFreeShip(): boolean {
    return (
      this.selectedItems.length > 0 &&
      this.selectedItems.every((i) =>
        (i.product.labels || []).some((l: string) => l.toLowerCase().includes('freeship')),
      )
    );
  }

  emptyForm(): UserAddress {
    return {
      fullName: '',
      phone: '',
      provinceCode: '',
      provinceName: '',
      wardCode: '',
      wardName: '',
      detail: '',
      isDefault: false,
    };
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const nav = history.state;
      this.selectedItemIds = nav?.itemIds ?? [];

      // Set payment method from chatbot if provided
      if (nav?.paymentMethod) {
        const method = nav.paymentMethod.toUpperCase();
        if (method === 'COD' || method === 'VNPAY' || method === 'VISA') {
          this.selectedPaymentMethod = method;
        }
      }
    }

    this.locationService.getProvinces().subscribe((p) => {
      this.provinces = p;
      this.cdr.detectChanges();
    });
    this.voucherService.getMyVouchers().subscribe((v) => {
      this.myVouchers = v;
      this.cdr.detectChanges();
    });
    this.addressService.getAll().subscribe((list) => {
      this.addresses = list;
      const def = list.find((a) => a.isDefault);
      if (def) this.selectedAddressId = def.id!;
      this.calcShipping();
      this.cdr.markForCheck();
    });

    this.cartService.cartItems$.subscribe((items) => {
      this.cartItems = items;
      this.selectedItems = this.selectedItemIds.length
        ? items.filter((i) => this.selectedItemIds.includes(i.id))
        : items;
      this.cdr.markForCheck();
    });
    this.cartService.refreshCart();
  }

  calcShipping() {
    if (this.hasFreeShip || !this.selectedAddress) {
      this.shippingFee = 0;
      return;
    }
    this.shippingFee = this.selectedAddress.provinceCode === HCM_CODE ? 15000 : 30000;
  }

  selectAddress(id: number) {
    this.selectedAddressId = id;
    this.calcShipping();
  }

  // Address modal
  openAddAddress() {
    this.editingAddress = null;
    this.addressForm = this.emptyForm();
    this.wards = [];
    this.showAddressModal = true;
  }

  openEditAddress(addr: UserAddress) {
    this.editingAddress = addr;
    this.addressForm = { ...addr };
    this.wards = [];
    if (addr.provinceCode) {
      this.loadingWards = true;
      this.locationService.getWards(addr.provinceCode).subscribe((w) => {
        this.wards = w;
        this.loadingWards = false;
        this.cdr.markForCheck();
      });
    }
    this.showAddressModal = true;
  }

  onFormProvinceChange(code: string) {
    const prov = this.provinces.find((p) => p.code === code);
    this.addressForm.provinceName = prov?.name ?? '';
    this.addressForm.wardCode = '';
    this.addressForm.wardName = '';
    this.wards = [];
    if (code) {
      this.loadingWards = true;
      this.locationService.getWards(code).subscribe((w) => {
        this.wards = w;
        this.loadingWards = false;
        this.cdr.markForCheck();
      });
    }
  }

  onFormWardChange(code: string) {
    const ward = this.wards.find((w) => w.code === code);
    this.addressForm.wardName = ward?.name ?? '';
  }

  saveAddress() {
    if (
      !this.addressForm.fullName ||
      !this.addressForm.phone ||
      !this.addressForm.provinceCode ||
      !this.addressForm.detail
    ) {
      this.message.warning('Vui lòng điền đầy đủ thông tin');
      return;
    }
    const req$ = this.editingAddress?.id
      ? this.addressService.update(this.editingAddress.id, this.addressForm)
      : this.addressService.create(this.addressForm);

    req$.subscribe({
      next: () => {
        this.message.success(this.editingAddress ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ');
        this.showAddressModal = false;
        this.addressService.getAll().subscribe((list) => {
          this.addresses = list;
          if (!this.selectedAddressId) {
            const def = list.find((a) => a.isDefault);
            if (def) this.selectedAddressId = def.id!;
          }
          this.calcShipping();
          this.cdr.markForCheck();
        });
      },
      error: () => this.message.error('Có lỗi xảy ra'),
    });
  }

  deleteAddress(id: number) {
    this.addressService.delete(id).subscribe({
      next: () => {
        this.message.success('Đã xóa địa chỉ');
        this.addresses = this.addresses.filter((a) => a.id !== id);
        if (this.selectedAddressId === id) {
          this.selectedAddressId = this.addresses[0]?.id ?? null;
        }
        this.calcShipping();
        this.cdr.markForCheck();
      },
    });
  }

  applyVoucher(overrideCode?: string) {
    const code = overrideCode || this.voucherCode;
    if (!code) {
      this.message.warning('Vui lòng chọn hoặc nhập mã giảm giá');
      return;
    }

    const ids =
      this.selectedItemIds.length > 0 ? this.selectedItemIds : this.selectedItems.map((i) => i.id);

    if (!ids.length) {
      this.message.warning('Không có sản phẩm nào được chọn');
      return;
    }

    this.voucherService.applyVoucher(code, ids).subscribe({
      next: (res) => {
        this.appliedVoucher = res;
        this.voucherCode = code;
        this.showVoucherModal = false;
        this.message.success('Áp dụng mã giảm giá thành công!');
        this.cdr.detectChanges();
      },
      error: (err) =>
        this.message.error(
          err.error?.message || 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện',
        ),
    });
  }

  removeVoucher() {
    this.appliedVoucher = null;
    this.voucherCode = '';
    this.cdr.detectChanges();
  }

  placeOrder() {
    if (!this.selectedAddressId && !this.hasFreeShip) {
      this.message.warning('Vui lòng chọn địa chỉ giao hàng');
      return;
    }
    if (!this.selectedAddressId) {
      this.message.warning('Vui lòng chọn địa chỉ giao hàng');
      return;
    }

    this.isPlacingOrder = true;
    const method = this.selectedPaymentMethod === 'VISA' ? 'VNPAY' : this.selectedPaymentMethod;

    this.orderService
      .checkout({
        paymentMethod: method,
        itemIds: this.selectedItemIds.length ? this.selectedItemIds : undefined,
        voucherCode: this.appliedVoucher ? this.voucherCode : undefined,
        addressId: this.selectedAddressId,
        shippingFee: this.shippingFee,
      })
      .subscribe({
        next: (res) => {
          this.isPlacingOrder = false;
          if (res.paymentUrl) {
            window.location.href = res.paymentUrl;
            return;
          }
          this.message.success('Đặt hàng thành công!');
          this.cartService.refreshCart();
          this.router.navigate(['/order-success'], {
            state: {
              orderId: res.id,
              totalAmount: res.totalAmount,
              paymentMethod: res.paymentMethod,
              shippingAddress: res.shippingAddress,
            },
          });
        },
        error: (err) => {
          this.isPlacingOrder = false;
          this.message.error(err.error?.message || 'Có lỗi xảy ra');
        },
      });
  }

  removeItem(itemId: number) {
    this.cartService.removeItem(itemId).subscribe({
      next: () => {
        this.message.success('Đã xóa sản phẩm khỏi giỏ hàng');
        // Refresh cart
        this.cartService.refreshCart();
        // Remove from selectedItemIds
        this.selectedItemIds = this.selectedItemIds.filter((id) => id !== itemId);
        // If no items left, go back to cart
        if (this.selectedItems.length === 0) {
          this.router.navigate(['/cart']);
        }
      },
      error: () => {
        this.message.error('Không thể xóa sản phẩm');
      },
    });
  }
}
