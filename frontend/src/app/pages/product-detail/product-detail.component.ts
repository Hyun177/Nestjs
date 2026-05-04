import { Component, OnInit, OnDestroy, inject, PLATFORM_ID, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { ProductService, Product } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { VndCurrencyPipe } from '../../shared/pipes/vnd-currency.pipe';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../core/services/review.service';
import { AuthService } from '../../core/services/auth.service';
import { ShopService } from '../../core/services/shop.service';
import { ChatService } from '../../core/services/chat.service';
import { UrlEncodePipe } from '../../shared/pipes/url-encode.pipe';
import { Subject, Subscription } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzIconModule, NzButtonModule, NzRateModule, NzPopconfirmModule, VndCurrencyPipe, UrlEncodePipe, RouterLink, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  providers: [NzMessageService]
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private reviewService = inject(ReviewService);
  private authService = inject(AuthService);
  private message = inject(NzMessageService);
  private platformId = inject(PLATFORM_ID);
  private shopService = inject(ShopService);
  private chatService = inject(ChatService);
  private cdr = inject(ChangeDetectorRef);

  private destroy$ = new Subject<void>();
  private productSub?: Subscription;

  product: Product | null = null;
  selectedImage: string = '';
  selectedAttributes: { [key: string]: string } = {};
  currentVariant: any = null;
  quantity: number = 1;
  isLoading: boolean = true;
  hasError: boolean = false;
  shop: any = null;

  reviews: any[] = [];
  recommendedProducts: Product[] = [];
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
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      this.isLoggedIn = !!user;
      this.currentUser = user;
      if (this.product) this.checkCanReview();
      this.cdr.markForCheck();
    });

    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((a, b) => a.get('id') === b.get('id'))
    ).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.productSub?.unsubscribe();
        this.resetData();
        this.loadProduct(+id);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.productSub?.unsubscribe();
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
    this.cdr.detectChanges();

    this.productSub?.unsubscribe();

    this.productSub = this.productService.getProductById(id).subscribe({
      next: (prod: Product) => {
        if (!prod) {
          this.isLoading = false;
          this.hasError = true;
          this.cdr.markForCheck();
          this.message.error('Sản phẩm không tồn tại');
          return;
        }
        this.product = prod;
        this.selectedImage = prod.image;
        this.isLoading = false;

        if (prod.attributes) {
          prod.attributes.forEach((attr: any) => {
            if (attr.options.length > 0) {
              this.selectedAttributes[attr.name] = attr.options[0];
            }
          });
          this.updateCurrentVariant();
        }

        this.cdr.detectChanges();
        this.loadReviews();
        this.checkCanReview();
        this.loadRecommended(prod);
        if (prod.userId) {
          this.loadShop(prod.userId);
        }
      },
      error: (err: any) => {
        console.error('Error fetching product:', err);
        this.isLoading = false;
        this.hasError = true;
        this.cdr.detectChanges();
        this.message.error('Lỗi khi tải thông tin sản phẩm');
      }
    });
  }

  loadRecommended(prod: Product) {
    this.productService.getRecommended(prod.id, prod.brandId, prod.categoryId).subscribe({
      next: (items) => {
        if (items.length >= 4) {
          this.recommendedProducts = items;
          this.cdr.markForCheck();
          return;
        }
        // Fallback: same category
        this.productService.getByCategory(prod.categoryId, prod.id).subscribe({
          next: (catItems) => {
            if (catItems.length >= 2) {
              this.recommendedProducts = catItems;
              this.cdr.markForCheck();
              return;
            }
            // Fallback: top selling
            this.productService.getTopSelling().subscribe({
              next: (top) => {
                this.recommendedProducts = top.filter(p => p.id !== prod.id).slice(0, 8);
                this.cdr.markForCheck();
              }
            });
          }
        });
      },
      error: () => {
        this.productService.getTopSelling().subscribe({
          next: (top) => {
            this.recommendedProducts = top.filter(p => p.id !== prod.id).slice(0, 8);
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  loadReviews() {
    if (!this.product) return;
    this.reviewService.getProductReviews(this.product.id).subscribe((res: any[]) => {
      this.reviews = res;
      const myReview = res.find((r: any) => r.userId === this.currentUser?.userId);
      if (myReview) {
        this.isEditingReview = true;
        this.reviewId = myReview.id;
        this.reviewForm.rating = myReview.rating;
        this.reviewForm.comment = myReview.comment;
        this.reviewForm.imagePreview = myReview.image ? 'https://nestjs-zvmg.onrender.com' + myReview.image : '';
      } else {
        this.isEditingReview = false;
        this.reviewId = null;
      }
      this.cdr.markForCheck();
    });
  }

  checkCanReview() {
    if (!this.isLoggedIn || !this.product) return;
    this.reviewService.canReview(this.product.id).subscribe((can: boolean) => {
      this.canUserReview = can;
      this.cdr.markForCheck();
    });
  }

  openEditReview() {
    this.showReviewForm = true;
  }

  deleteReview() {
    if (!this.reviewId) return;
    this.reviewService.deleteReview(this.reviewId).subscribe({
      next: () => {
        this.message.success('Đã xóa đánh giá');
        this.showReviewForm = false;
        this.isEditingReview = false;
        this.reviewId = null;
        this.reviewForm = { rating: 5, comment: '', imageFile: null, imagePreview: '' };
        this.loadProduct(this.product!.id);
      },
      error: (err) => this.message.error(err.error?.message || 'Không thể xóa đánh giá'),
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.reviewForm.imageFile = file;
      const reader = new FileReader();
      reader.onload = e => { this.reviewForm.imagePreview = reader.result; this.cdr.markForCheck(); };
      reader.readAsDataURL(file);
    }
  }

  submitReview() {
    if (!this.product) return;
    if (!this.reviewForm.comment.trim()) {
      this.message.warning('Vui lòng nhập nội dung đánh giá');
      return;
    }

    this.isSubmittingReview = true;
    const formData = new FormData();
    formData.append('productId', this.product.id.toString());
    formData.append('rating', this.reviewForm.rating.toString());
    formData.append('comment', this.reviewForm.comment);
    if (this.reviewForm.imageFile) formData.append('image', this.reviewForm.imageFile);

    const request$ = this.isEditingReview && this.reviewId
      ? this.reviewService.updateReview(this.reviewId, formData)
      : this.reviewService.submitReview(formData);

    request$.subscribe({
      next: () => {
        this.message.success(this.isEditingReview ? 'Cập nhật đánh giá thành công' : 'Gửi đánh giá thành công');
        this.isSubmittingReview = false;
        this.showReviewForm = false;
        this.loadProduct(this.product!.id);
      },
      error: (err) => {
        this.isSubmittingReview = false;
        this.message.error(err.error?.message || 'Có lỗi xảy ra');
      },
    });
  }

  selectImage(url: string) {
    this.selectedImage = url;
    this.cdr.markForCheck();
  }

  scrollToImage(img: string) {
    this.selectedImage = img;
    const element = document.getElementById('img-' + img);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  get allImages(): string[] {
    if (!this.product) return [];
    return [this.product.image, ...(this.product.images || [])];
  }

  prevImage() {
    const imgs = this.allImages;
    const idx = imgs.indexOf(this.selectedImage);
    this.selectedImage = imgs[(idx - 1 + imgs.length) % imgs.length];
    this.cdr.markForCheck();
  }

  nextImage() {
    const imgs = this.allImages;
    const idx = imgs.indexOf(this.selectedImage);
    this.selectedImage = imgs[(idx + 1) % imgs.length];
    this.cdr.markForCheck();
  }

  getStructuredDescription(): { type: 'header' | 'bullet' | 'text', content: string }[] {
    if (!this.product?.description) return [];
    const lines = this.product.description.split('\n').filter(l => l.trim().length > 0);
    return lines.map(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.endsWith(':') || (trimmedLine.length < 30 && trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3)) {
        return { type: 'header', content: trimmedLine };
      }
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || trimmedLine.startsWith('•')) {
        return { type: 'bullet', content: trimmedLine.substring(1).trim() };
      }
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
      return Object.keys(v.attributes).every(key => {
        const selectedVal = (this.selectedAttributes[key] || '').toLowerCase().trim();
        const variantVal = (v.attributes[key] || '').toLowerCase().trim();
        return selectedVal === variantVal;
      });
    });

    if (this.currentVariant?.image) {
      this.selectedImage = this.currentVariant.image;
    }

    const maxStock = this.currentVariant?.stock ?? this.product?.stock ?? 0;
    if (this.quantity > maxStock) this.quantity = Math.max(1, maxStock);
  }

  isAttrDisabled(attrName: string, value: string): boolean {
    if (!this.product?.variants || this.product.variants.length === 0) return false;
    return !this.product.variants.some(v => {
      if (v.attributes[attrName] !== value) return false;
      return Object.keys(this.selectedAttributes).every(key => {
        if (key === attrName) return true;
        return v.attributes[key] === this.selectedAttributes[key];
      });
    });
  }

  buyNow() {
    if (!this.product) return;
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
      next: (cart: any) => {
        this.cartService.refreshCart();
        const items: any[] = cart.items || [];
        const match = items.find((i: any) =>
          i.productId === this.product!.id && (i.size || '') === size && (i.color || '') === color
        );
        const itemIds = match ? [match.id] : [];
        this.router.navigate(['/order-confirm'], { state: { itemIds } });
      },
      error: (err) => {
        if (err.status === 401) this.message.warning('Vui lòng đăng nhập để mua hàng');
        else this.message.error(err.error?.message || 'Không thể thêm vào giỏ hàng');
      }
    });
  }

  updateQuantity(val: number) {
    this.quantity = Math.max(1, this.quantity + val);
  }

  addToCart() {
    if (!this.product) return;
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
        this.cartService.refreshCart();
      },
      error: (err) => {
        if (err.status === 401) this.message.warning('Vui lòng đăng nhập để mua hàng');
        else this.message.error(err.error?.message || 'Không thể thêm vào giỏ hàng');
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
      'đen': 'black', 'trắng': 'white', 'đỏ': 'red', 'xanh dương': 'blue', 'xanh lá': 'green',
      'vàng': 'gold', 'tím': 'purple', 'hồng': 'pink', 'cam': 'orange', 'xám': 'gray',
      'nâu': 'brown', 'bạc': 'silver', 'titan': '#8e8e8e'
    };
    return colorMap[colorName.toLowerCase().trim()] || colorName;
  }

  getFullUrl(path: string, fallback: string = ''): string {
    if (!path) return fallback;
    if (path.startsWith('http')) return path;
    return `https://nestjs-zvmg.onrender.com${path.startsWith('/') ? '' : '/'}${path}`;
  }

  loadShop(sellerId: number) {
    this.shopService.getShopBySeller(sellerId).subscribe({
      next: (res) => { this.shop = res; this.cdr.markForCheck(); },
      error: () => { this.shop = null; this.cdr.markForCheck(); }
    });
  }

  chatWithSeller() {
    if (!this.isLoggedIn) {
      this.message.warning('Vui lòng đăng nhập để chat với người bán');
      this.router.navigate(['/login']);
      return;
    }

    const currentUserId = this.currentUser?.id || this.currentUser?.userId;
    if (this.product?.userId === currentUserId) {
      this.message.info('Đây là sản phẩm của bạn');
      return;
    }

    if (this.product?.userId) {
      this.chatService.createConversation(this.product.userId).subscribe({
        next: (convo) => {
          this.router.navigate(['/chat'], { 
            queryParams: { 
              id: convo.id, 
              productId: this.product?.id 
            } 
          });
        },
        error: (err) => {
          this.message.error(err.error?.message || 'Không thể tạo cuộc hội thoại');
        }
      });
    } else {
      this.message.warning('Không tìm thấy thông tin người bán');
    }
  }
}
