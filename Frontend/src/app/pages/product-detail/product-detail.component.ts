import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { ProductService, Product } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { VndCurrencyPipe } from '../../shared/pipes/vnd-currency.pipe';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../core/services/review.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzButtonModule, NzRateModule, VndCurrencyPipe, RouterLink, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  providers: [NzMessageService]
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private reviewService = inject(ReviewService);
  private authService = inject(AuthService);
  private message = inject(NzMessageService);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  product: Product | null = null;
  selectedImage: string = '';
  selectedAttributes: { [key: string]: string } = {};
  currentVariant: any = null;
  quantity: number = 1;
  isLoading: boolean = true;
  hasError: boolean = false;

  reviews: any[] = [];
  canUserReview: boolean = false;
  isLoggedIn: boolean = false;
  currentUser: any = null;

  showReviewForm: boolean = false;
  isEditingReview: boolean = false;
  reviewId: number | null = null;
  reviewForm = {
    rating: 5,
    comment: '',
    imageFile: null as File | null,
    imagePreview: '' as string | ArrayBuffer | null
  };
  isSubmittingReview: boolean = false;

  getDescriptionPoints(): string[] {
    if (!this.product?.description) return [];
    // Split by period or newline and clean up
    return this.product.description
      .split(/[.\n]/)
      .map(p => p.trim())
      .filter(p => p.length > 5);
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe((user: any) => {
      this.isLoggedIn = !!user;
      this.currentUser = user;
      if (this.product) this.checkCanReview();
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.resetData();
        this.loadProduct(+id);
        // Explicitly force detection to ensure spinner shows
        this.cdr.detectChanges();
      }
    });
  }

  resetData() {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo(0, 0);
    }
    this.product = null;
    this.selectedAttributes = {};
    this.currentVariant = null;
    this.quantity = 1;
    this.isLoading = true;
    this.hasError = false;
    this.reviews = [];
    this.canUserReview = false;
    this.showReviewForm = false;
    this.cdr.detectChanges();
  }

  retryLoad() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.resetData();
      this.loadProduct(+id);
    }
  }

  loadProduct(id: number) {
    this.isLoading = true;
    this.hasError = false;

    // Safety timeout: 10 seconds
    const safetyTimer = setTimeout(() => {
      if (this.isLoading && !this.product) {
        this.isLoading = false;
        this.hasError = true;
        this.message.warning('Yêu cầu đang phản hồi chậm... Vui lòng thử lại');
      }
    }, 10000);

    this.productService.getProductById(id).subscribe({
      next: (prod: Product) => {
        clearTimeout(safetyTimer);
        this.isLoading = false;
        if (!prod) {
          this.hasError = true;
          this.cdr.detectChanges();
          this.message.error('Sản phẩm không tồn tại');
          return;
        }
        this.product = prod;
        this.selectedImage = prod.image;

        // Default attributes
        if (prod.attributes) {
          prod.attributes.forEach((attr: any) => {
            if (attr.options.length > 0) {
              this.selectedAttributes[attr.name] = attr.options[0];
            }
          });
          this.updateCurrentVariant();
        }

        this.loadReviews();
        this.checkCanReview();
        this.cdr.detectChanges(); // Force Angular to re-render after SSR hydration
      },
      error: (err: any) => {
        clearTimeout(safetyTimer);
        console.error('Error fetching product:', err);
        this.isLoading = false;
        this.hasError = true;
        this.cdr.detectChanges();
        this.message.error('Lỗi khi tải thông tin sản phẩm');
      }
    });
  }

  loadReviews() {
    if (!this.product) return;
    this.reviewService.getProductReviews(this.product.id).subscribe((res: any[]) => {
      this.reviews = res;
      // Check if user has a review to enable "Edit" mode potentially
      const myReview = res.find((r: any) => r.userId === this.currentUser?.userId);
      if (myReview) {
        this.isEditingReview = true;
        this.reviewId = myReview.id;
        this.reviewForm.rating = myReview.rating;
        this.reviewForm.comment = myReview.comment;
        this.reviewForm.imagePreview = myReview.image ? 'http://localhost:3000' + myReview.image : '';
      }
      this.cdr.detectChanges();
    });
  }

  checkCanReview() {
    if (!this.isLoggedIn || !this.product) return;
    this.reviewService.canReview(this.product.id).subscribe((can: boolean) => {
      this.canUserReview = can;
      this.cdr.detectChanges();
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.reviewForm.imageFile = file;
      const reader = new FileReader();
      reader.onload = e => this.reviewForm.imagePreview = reader.result;
      reader.readAsDataURL(file);
    }
  }

  submitReview() {
    if (!this.product) return;
    if (!this.reviewForm.comment) {
      this.message.warning('Vui lòng nhập nội dung đánh giá');
      return;
    }

    this.isSubmittingReview = true;
    const formData = new FormData();
    formData.append('productId', this.product.id.toString());
    formData.append('rating', this.reviewForm.rating.toString());
    formData.append('comment', this.reviewForm.comment);
    if (this.reviewForm.imageFile) {
      formData.append('image', this.reviewForm.imageFile);
    }

    this.reviewService.submitReview(formData).subscribe({
      next: () => {
        this.message.success(this.isEditingReview ? 'Cập nhật đánh giá thành công!' : 'Gửi đánh giá thành công!');
        this.isSubmittingReview = false;
        this.showReviewForm = false;
        this.loadProduct(this.product!.id); // Reload to get updated avg rating
      },
      error: (err) => {
        this.isSubmittingReview = false;
        this.message.error(err.error?.message || 'Có lỗi xảy ra');
      }
    });
  }

  selectImage(url: string) {
    this.selectedImage = url;
    this.cdr.markForCheck();
  }

  getStructuredDescription(): { type: 'header' | 'bullet' | 'text', content: string }[] {
    if (!this.product?.description) return [];

    // Split into lines
    const lines = this.product.description.split('\n').filter(l => l.trim().length > 0);

    return lines.map(line => {
      const trimmedLine = line.trim();

      // Header: Ends with ':' or very short all uppercase
      if (trimmedLine.endsWith(':') || (trimmedLine.length < 30 && trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3)) {
        return { type: 'header', content: trimmedLine };
      }

      // Bullet point: Starts with '-', '*', or '•'
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || trimmedLine.startsWith('•')) {
        return { type: 'bullet', content: trimmedLine.substring(1).trim() };
      }

      // Default: regular text
      return { type: 'text', content: trimmedLine };
    });
  }

  selectAttribute(name: string, value: string) {
    this.selectedAttributes[name] = value;
    this.updateCurrentVariant();
  }

  updateCurrentVariant() {
    if (!this.product?.variants || this.product.variants.length === 0) {
      this.currentVariant = null;
      return;
    }

    this.currentVariant = this.product.variants.find((v: any) => {
      // Robust matching: trim and ignore case
      return Object.keys(v.attributes).every(key => {
        const selectedVal = (this.selectedAttributes[key] || '').toLowerCase().trim();
        const variantVal = (v.attributes[key] || '').toLowerCase().trim();
        return selectedVal === variantVal;
      });
    });

    // Handle quantity caps
    const maxStock = this.currentVariant?.stock ?? this.product?.stock ?? 0;
    if (this.quantity > maxStock) {
      this.quantity = Math.max(1, maxStock);
    }
  }

  isAttrDisabled(attrName: string, value: string): boolean {
    if (!this.product?.variants || this.product.variants.length === 0) return false;

    // Check if any variant exists with current other selected attributes + this value, and stock > 0
    return !this.product.variants.some(v => {
      // Must match the value being checked
      if (v.attributes[attrName] !== value) return false;

      // Must match all OTHER selected attributes
      return Object.keys(this.selectedAttributes).every(key => {
        if (key === attrName) return true;
        return v.attributes[key] === this.selectedAttributes[key];
      });
      
      // We can also check stock here if we want to hide out of stock options
      // return v.attributes[key] === this.selectedAttributes[key] && v.stock > 0;
    });
  }

  buyNow(product: Product) {
    if (product.attributes && product.attributes.length > 0) {
      this.router.navigate(['/product', product.id]);
      return;
    }
    this.cartService.addToCart(product.id, 1).subscribe({
      next: () => {
        this.cartService.refreshCart();
        this.router.navigate(['/cart']);
      },
      error: () => this.message.warning('Vui lòng đăng nhập')
    });
  }

  updateQuantity(val: number) {
    this.quantity = Math.max(1, this.quantity + val);
  }

  addToCart() {
    if (!this.product) return;

    // Smart attribute extraction for Backend
    let size = '';
    let color = '';

    Object.keys(this.selectedAttributes).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('size') || lowerKey.includes('dung lượng') || lowerKey.includes('bộ nhớ') || lowerKey.includes('kích thước')) {
        size = this.selectedAttributes[key];
      } else if (lowerKey.includes('color') || lowerKey.includes('màu')) {
        color = this.selectedAttributes[key];
      }
    });

    this.cartService.addToCart(this.product.id, this.quantity, size, color).subscribe({
      next: () => {
        this.message.success('Đã thêm vào giỏ hàng thành công!');
        this.cartService.refreshCart(); // Force refresh header count
      },
      error: (err) => {
        console.error('Cart Error:', err);
        if (err.status === 401) {
          this.message.warning('Vui lòng đăng nhập để mua hàng');
        } else {
          this.message.error(err.error?.message || 'Không thể thêm vào giỏ hàng. Vui lòng thử lại.');
        }
      }
    });
  }

  getDiscountPercent(product: Product): number {
    if (!product.originalPrice || product.originalPrice <= product.price) return 0;
    return Math.round(100 - (product.price * 100 / product.originalPrice));
  }

  isColorAttr(name: string): boolean {
    const n = name.toLowerCase();
    return n.includes('color') || n.includes('màu');
  }

  getColorCode(colorName: string): string {
    const colorMap: { [key: string]: string } = {
      'đen': 'black',
      'trắng': 'white',
      'đỏ': 'red',
      'xanh dương': 'blue',
      'xanh lá': 'green',
      'vàng': 'gold',
      'tím': 'purple',
      'hồng': 'pink',
      'cam': 'orange',
      'xám': 'gray',
      'nâu': 'brown',
      'bạc': 'silver',
      'titan': '#8e8e8e'
    };

    const lower = colorName.toLowerCase().trim();
    return colorMap[lower] || colorName; // Trả về mã map hoặc chính nó nếu là hex
  }
}
