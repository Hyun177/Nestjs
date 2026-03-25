import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { UserService } from '../../core/services/user.service';
import { OrderService } from '../../core/services/order.service';
import { ReviewService } from '../../core/services/review.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { VndCurrencyPipe } from '../../shared/pipes/vnd-currency.pipe';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { Router, RouterModule } from '@angular/router';

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
    VndCurrencyPipe,
    NzIconModule,
    NzRateModule,
    RouterModule
  ],
  providers: [NzMessageService],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private userService = inject(UserService);
  private orderService = inject(OrderService);
  private reviewService = inject(ReviewService);
  private favoriteService = inject(FavoriteService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

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
    imagePreview: ''
  };

  ngOnInit(): void {
    this.loadProfile();
    this.loadOrderHistory();
    this.loadFavorites();
  }

  loadFavorites() {
    this.favoriteService.getFavorites().subscribe({
      next: (res) => {
        this.favoriteProducts = res;
        this.cdr.markForCheck();
      }
    });
  }

  removeFavorite(productId: number, event: Event) {
    event.stopPropagation();
    this.favoriteService.toggleFavorite(productId).subscribe({
      next: () => {
        this.message.success('Đã xóa khỏi danh sách yêu thích');
        this.loadFavorites();
      }
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
      imagePreview: ''
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
      }
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
        this.cdr.markForCheck();
      },
      error: () => this.message.error('Lỗi khi tải thông tin cá nhân')
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
        this.loadProfile(); // Reset changes if cancelled
    }
  }

  getImageUrl(url?: string): string {
    if (!url) return 'assets/placeholder-user.png';
    if (url.startsWith('/uploads')) {
      return `http://localhost:3000${url}`;
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
        }
      });
    }
  }

  loadOrderHistory() {
    this.orderService.getHistory().subscribe({
      next: (res) => {
        this.orderHistory = res;
        this.cdr.markForCheck();
      },
      error: () => this.message.error('Lỗi khi tải lịch sử đơn hàng')
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
      }
    });
  }

  updateProfile() {
    this.isUpdatingProfile = true;
    this.userService.updateProfile({
      firstname: this.userProfile.firstname,
      lastname: this.userProfile.lastname,
      phone: this.userProfile.phone,
      address: this.userProfile.address,
      avatar: this.userProfile.avatar
    }).subscribe({
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
      }
    });
  }

  changePassword() {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.message.error('Mật khẩu xác nhận không khớp');
      return;
    }
    
    this.isChangingPassword = true;
    this.userService.changePassword({
      oldPassword: this.passwordData.oldPassword,
      newPassword: this.passwordData.newPassword
    }).subscribe({
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
      }
    });
  }
}

