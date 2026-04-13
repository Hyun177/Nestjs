import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { UserService } from '../../core/services/user.service';
import { OrderService } from '../../core/services/order.service';
import { ReviewService } from '../../core/services/review.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { AddressService, UserAddress } from '../../core/services/address.service';
import { LocationService, Province, Ward } from '../../core/services/location.service';
import { VoucherService } from '../../core/services/voucher.service';
import { VndCurrencyPipe } from '../../shared/pipes/vnd-currency.pipe';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { Router, RouterModule } from '@angular/router';
import { SellerRequestService } from '../../core/services/seller-request.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzInputModule,
    NzButtonModule,
    NzTableModule,
    NzTagModule,
    NzModalModule,
    NzSelectModule,
    NzCheckboxModule,
    VndCurrencyPipe,
    NzIconModule,
    NzRateModule,
    NzPopconfirmModule,
    RouterModule,
  ],
  providers: [NzMessageService],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private userService = inject(UserService);
  private orderService = inject(OrderService);
  private reviewService = inject(ReviewService);
  private favoriteService = inject(FavoriteService);
  private addressService = inject(AddressService);
  private locationService = inject(LocationService);
  private voucherService = inject(VoucherService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);
  private sellerRequestService = inject(SellerRequestService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  userProfile: any = {};
  passwordData = { oldPassword: '', newPassword: '', confirmPassword: '' };
  orderHistory: any[] = [];
  favoriteProducts: any[] = [];
  selectedOrder: any = null;
  isOrderModalVisible = false;
  isLoadingOrderDetails = false;

  isUpdatingProfile = false;
  isChangingPassword = false;
  showUrlInput = false;
  isEditing = false;
  activeTab = 'info';

  userRoleName = '';
  isSeller = false;
  pendingSellerRequest = false;

  readonly statusConfig: Record<string, { color: string; label: string; step: number }> = {
    PENDING: { color: '#f59e0b', label: 'Chờ xử lý', step: 0 },
    PAID: { color: '#3b82f6', label: 'Đã thanh toán', step: 1 },
    CONFIRMED: { color: '#6366f1', label: 'Đã xác nhận', step: 1 },
    PROCESSING: { color: '#8b5cf6', label: 'Đang chuẩn bị', step: 2 },
    SHIPPED: { color: '#ec4899', label: 'Đang giao', step: 3 },
    DELIVERED: { color: '#10b981', label: 'Đã giao', step: 4 },
    CANCELLED: { color: '#ef4444', label: 'Đã hủy', step: -1 },
    RETURNED: { color: '#64748b', label: 'Hoàn trả', step: -1 },
  };

  // Address Management
  addresses: UserAddress[] = [];
  isAddressModalVisible = false;
  isEditingAddress = false;
  isSavingAddress = false;
  editingAddressId: number | null = null;
  provinces: Province[] = [];
  wards: Ward[] = [];
  addressForm: UserAddress = {
    fullName: '', phone: '', provinceCode: '', provinceName: '', wardCode: '', wardName: '', detail: '', isDefault: false
  };

  // Review System
  isReviewModalVisible = false;
  isSubmittingReview = false;
  reviewData = {
    productId: 0,
    orderId: 0,
    productName: '',
    rating: 5,
    comment: '',
    imageFile: null as File | null,
    imagePreview: '',
  };

  // Voucher Warehouse
  publicVouchers: any[] = [];
  isLoadingVouchers = false;
  collectingVoucherId: number | null = null;

  ngOnInit(): void {
    this.loadProfile();
    this.loadOrderHistory();
    this.loadFavorites();

    // Auto-open order detail if navigated from order-success
    if (isPlatformBrowser(this.platformId)) {
      const state = history.state;
      if (state?.openOrderId) {
        this.activeTab = 'orders';
        this.viewOrderDetails(state.openOrderId);
      }
    }
  }

  loadFavorites() {
    this.favoriteService.getFavorites().subscribe({
      next: (res) => {
        this.favoriteProducts = res;
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status === 401) {
          this.favoriteProducts = [];
        } else {
          console.error('Failed to load favorites', err);
        }
        this.cdr.markForCheck();
      },
    });
  }

  getOrderRawTotal(): number {
    if (!this.selectedOrder) return 0;
    const raw =
      Number(this.selectedOrder.totalAmount || 0) +
      Number(this.selectedOrder.discountAmount || 0) -
      Number(this.selectedOrder.shippingFee || 0);
    return Number(raw.toFixed(0));
  }

  removeFavorite(productId: number, event: Event) {
    event.stopPropagation();
    this.favoriteService.toggleFavorite(productId).subscribe({
      next: () => {
        this.message.success('Đã xóa khỏi danh sách yêu thích');
        this.loadFavorites();
      },
    });
  }

  goToProduct(productId: number) {
    this.router.navigate(['/product', productId]);
  }

  openReviewModal(item: any, orderId: number) {
    this.reviewData = {
      productId: item.productId,
      orderId: orderId,
      productName: item.product?.name || 'Sản phẩm',
      rating: 5,
      comment: '',
      imageFile: null,
      imagePreview: '',
    };
    this.isReviewModalVisible = true;
  }

  onReviewImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.reviewData.imageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.reviewData.imagePreview = reader.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  submitReview() {
    if (!this.reviewData.comment) {
      this.message.warning('Vui lòng nhập nội dung đánh giá');
      return;
    }

    this.isSubmittingReview = true;
    const formData = new FormData();
    formData.append('productId', this.reviewData.productId.toString());
    formData.append('orderId', this.reviewData.orderId.toString());
    formData.append('rating', this.reviewData.rating.toString());
    formData.append('comment', this.reviewData.comment);
    if (this.reviewData.imageFile) {
      formData.append('image', this.reviewData.imageFile);
    }

    this.reviewService.submitReview(formData).subscribe({
      next: () => {
        this.message.success('Đã gửi đánh giá thành công! Cảm ơn bạn.');
        this.isSubmittingReview = false;
        this.isReviewModalVisible = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Không thể gửi đánh giá');
        this.isSubmittingReview = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadProfile() {
    this.userService.getProfile().subscribe({
      next: (res) => {
        this.userProfile = res;
        // Extract role names if it's an array of objects or just a string
        if (res.roles && Array.isArray(res.roles)) {
          this.userRoleName = res.roles.map((r: any) => r.name || r).join(', ');
        } else {
          this.userRoleName = res.role || 'Thành viên';
        }
        this.checkSellerStatus();
        this.cdr.markForCheck();
      },
      error: () => this.message.error('Lỗi khi tải thông tin cá nhân'),
    });
  }

  checkSellerStatus() {
    if (this.userProfile.roles) {
      this.isSeller = this.userProfile.roles.some((r: any) => {
        const roleName = (r.name || r || '').toString().toLowerCase();
        return roleName === 'seller';
      });
    }
    
    if (!this.isSeller) {
      this.sellerRequestService.getMyRequests().subscribe(res => {
        this.pendingSellerRequest = res.some((req: any) => req.status === 'PENDING');
        this.cdr.markForCheck();
      });
    }
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.loadProfile(); // Reset changes if cancelled
    }
  }

  getImageUrl(url?: string): string {
    if (!url) return 'https://ui-avatars.com/api/?name=User&background=random';
    if (typeof url === 'string' && url.startsWith('/uploads')) {
      return `https://nestjs-zvmg.onrender.com${url}`;
    }
    return url;
  }

  triggerAvatarUpload() {
    const fileInput = document.getElementById('avatarInput') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('avatar', file);

      this.userService.uploadAvatar(formData).subscribe({
        next: (res) => {
          this.userProfile.avatar = res.avatar;
          this.message.success('Cập nhật ảnh đại diện thành công');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.message.error(err.error?.message || 'Lỗi khi upload ảnh');
        },
      });
    }
  }

  loadOrderHistory() {
    this.orderService.getHistory().subscribe({
      next: (res) => {
        this.orderHistory = res;
        this.cdr.markForCheck();
      },
      error: () => this.message.error('Lỗi khi tải lịch sử đơn hàng'),
    });
  }

  viewOrderDetails(orderId: number) {
    this.isOrderModalVisible = true;
    this.isLoadingOrderDetails = true;
    this.selectedOrder = null;
    this.orderService.getOrderById(orderId).subscribe({
      next: (res) => {
        this.selectedOrder = res;
        this.isLoadingOrderDetails = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.message.error('Không thể tải chi tiết đơn hàng');
        this.isLoadingOrderDetails = false;
        this.isOrderModalVisible = false;
        this.cdr.markForCheck();
      },
    });
  }

  updateProfile() {
    this.isUpdatingProfile = true;
    this.userService
      .updateProfile({
        firstname: this.userProfile.firstname,
        lastname: this.userProfile.lastname,
        phone: this.userProfile.phone,
        address: this.userProfile.address,
        avatar: this.userProfile.avatar,
      })
      .subscribe({
        next: () => {
          this.isUpdatingProfile = false;
          this.isEditing = false;
          this.message.success('Cập nhật thông tin thành công');
          this.cdr.markForCheck();
        },
        error: () => {
          this.isUpdatingProfile = false;
          this.message.error('Cập nhật thất bại');
          this.cdr.markForCheck();
        },
      });
  }

  changePassword() {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.message.error('Mật khẩu xác nhận không khớp');
      return;
    }

    this.isChangingPassword = true;
    this.userService
      .changePassword({
        oldPassword: this.passwordData.oldPassword,
        newPassword: this.passwordData.newPassword,
      })
      .subscribe({
        next: () => {
          this.isChangingPassword = false;
          this.passwordData = { oldPassword: '', newPassword: '', confirmPassword: '' };
          this.message.success('Đổi mật khẩu thành công');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isChangingPassword = false;
          this.message.error('Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu cũ.');
          this.cdr.markForCheck();
        },
      });
  }

  loadAddresses() {
    this.addressService.getAll().subscribe({
      next: (res) => { this.addresses = res; this.cdr.markForCheck(); },
      error: () => this.message.error('Lỗi khi tải địa chỉ'),
    });
  }

  openAddressModal(address?: UserAddress & { id?: number }) {
    if (address) {
      this.isEditingAddress = true;
      this.editingAddressId = address.id ?? null;
      this.addressForm = { ...address };
      if (address.provinceCode) this.onProvinceChange(address.provinceCode, false);
    } else {
      this.isEditingAddress = false;
      this.editingAddressId = null;
      this.addressForm = { fullName: '', phone: '', provinceCode: '', provinceName: '', wardCode: '', wardName: '', detail: '', isDefault: false };
      this.wards = [];
    }
    if (this.provinces.length === 0) {
      this.locationService.getProvinces().subscribe(p => { this.provinces = p; this.cdr.markForCheck(); });
    }
    this.isAddressModalVisible = true;
  }

  onProvinceChange(code: string, resetWard = true) {
    const province = this.provinces.find(p => p.code === code);
    this.addressForm.provinceName = province?.name || '';
    if (resetWard) { this.addressForm.wardCode = ''; this.addressForm.wardName = ''; }
    this.locationService.getWards(code).subscribe(w => { this.wards = w; this.cdr.markForCheck(); });
  }

  onWardChange(code: string) {
    const ward = this.wards.find(w => w.code === code);
    this.addressForm.wardName = ward?.name || '';
  }

  saveAddress() {
    if (!this.addressForm.fullName || !this.addressForm.phone || !this.addressForm.provinceCode || !this.addressForm.detail) {
      this.message.warning('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    this.isSavingAddress = true;
    const req = this.isEditingAddress && this.editingAddressId
      ? this.addressService.update(this.editingAddressId, this.addressForm)
      : this.addressService.create(this.addressForm);
    req.subscribe({
      next: () => {
        this.message.success(this.isEditingAddress ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ mới');
        this.isSavingAddress = false;
        this.isAddressModalVisible = false;
        this.loadAddresses();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Không thể lưu địa chỉ');
        this.isSavingAddress = false;
        this.cdr.markForCheck();
      },
    });
  }

  deleteAddress(id: number) {
    this.addressService.delete(id).subscribe({
      next: () => { this.message.success('Đã xóa địa chỉ'); this.loadAddresses(); },
      error: () => this.message.error('Không thể xóa địa chỉ'),
    });
  }

  setDefaultAddress(id: number) {
    this.addressService.setDefault(id).subscribe({
      next: () => { this.message.success('Đã đặt làm địa chỉ mặc định'); this.loadAddresses(); },
      error: () => this.message.error('Không thể cập nhật'),
    });
  }

  loadPublicVouchers() {
    this.isLoadingVouchers = true;
    this.voucherService.getPublicVouchers().subscribe({
      next: (res) => {
        this.publicVouchers = res;
        this.isLoadingVouchers = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingVouchers = false;
        this.message.error('Không thể tải kho voucher');
        this.cdr.markForCheck();
      },
    });
  }

  collectVoucher(voucher: any) {
    if (voucher.isCollected) return;
    this.collectingVoucherId = voucher.id;
    this.voucherService.collectVoucher(voucher.id).subscribe({
      next: () => {
        this.message.success(`Đã thu thập voucher ${voucher.code}!`);
        voucher.isCollected = true;
        this.collectingVoucherId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Không thể thu thập voucher');
        this.collectingVoucherId = null;
        this.cdr.markForCheck();
      },
    });
  }

  getVoucherDaysLeft(endDate: string): number {
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  cancelOrder(orderId: number) {
    this.orderService.cancelOrder(orderId).subscribe({
      next: () => {
        this.message.success('Đã hủy đơn hàng thành công');
        this.loadOrderHistory();
        if (this.selectedOrder && this.selectedOrder.id === orderId) {
          this.selectedOrder.status = 'CANCELLED';
        }
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.message.error(err.error?.message || 'Không thể hủy đơn hàng');
      },
    });
  }
}
