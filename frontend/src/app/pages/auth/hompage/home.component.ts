import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../../core/services/product.service';
import { BrandService } from '../../../core/services/brand.service';
import { CartService } from '../../../core/services/cart.service';
import { FavoriteService } from '../../../core/services/favorite.service';
import { VndCurrencyPipe } from '../../../shared/pipes/vnd-currency.pipe';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, NzIconModule, NzButtonModule, VndCurrencyPipe, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [NzMessageService],
})
export class HomeComponent implements OnInit {
  private productService = inject(ProductService);
  private brandService = inject(BrandService);
  private cartService = inject(CartService);
  private favoriteService = inject(FavoriteService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  products: Product[] = [];
  topSelling: Product[] = [];
  brands: any[] = [];
  premiumBrands: any[] = [];
  favoriteProductIds = new Set<number>();

  heroData = {
    title: 'FIND ELECTRONICS THAT MATCH YOUR NEEDS',
    subtitle:
      'Browse through our diverse range of high-quality electronic devices, designed to enhance your daily life and suit your personal preferences.',
    primaryCta: 'Shop Now',
  };

  stats = [
    { value: '200+', label: 'International Brands' },
    { value: '2,000+', label: 'High-Quality Products' },
    { value: '30,000+', label: 'Happy Customers' },
  ];

  categories = [
    {
      title: 'Casual',
      image: 'https://35express.org/wp-content/uploads/2025/02/nguon-goc-meme-doraemon.png.webp',
    },
    {
      title: 'Formal',
      image:
        'https://assets.myntassets.com/w_200,q_50,,dpr_3,fl_progressive,f_webp/assets/images/10777836/2019/10/16/d9ae4409-16a9-4f7e-83b1-2022d3bf353c1571215965504-MANQ-Men-Blazers-6291571215962908-1.jpg',
    },
    { title: 'Party', image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800' },
    { title: 'Gym', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800' },
  ];

  testimonials = [
    {
      name: 'Sarah M.',
      text: '"I\'m blown away by the quality and style of the clothes I received from Shop.co. From casual wear to elegant dresses, every piece I\'ve bought has exceeded my expectations."',
      verified: true,
    },
    {
      name: 'Alex K.',
      text: '"Finding clothes that align with my personal style used to be a challenge until I discovered Shop.co. The range of options they offer is truly remarkable."',
      verified: true,
    },
    {
      name: 'James L.',
      text: '"As someone who\'s always on the lookout for unique fashion pieces, I\'m thrilled to have stumbled upon Shop.co. The selection of clothes is not only diverse but also on-point with the latest trends."',
      verified: true,
    },
  ];

  get newArrivalProducts() {
    return this.products.slice(0, 8);
  }

  get hasMoreProducts() {
    return this.products.length > 8;
  }

  get topSellingProducts() {
    return this.topSelling.slice(0, 4);
  }

  ngOnInit() {
    this.fetchData();
    this.loadFavorites();
  }

  fetchData() {
    this.productService.getProducts().subscribe({
      next: (res) => {
        this.products = res;
        this.cdr.markForCheck();
      },
      error: () => console.error('Failed to load products'),
    });

    this.productService.getTopSelling().subscribe({
      next: (res) => {
        this.topSelling = res;
        this.cdr.markForCheck();
      },
      error: () => console.error('Failed to load top selling'),
    });

    this.brandService.getBrands().subscribe({
      next: (res: any[]) => {
        this.brands = res;
        this.premiumBrands = res.filter(b => b.isPremium);

        // If no premium, use defaults for display
        if (this.premiumBrands.length === 0) {
          this.premiumBrands = [
            { name: 'Apple', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
            { name: 'Samsung', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg' },
            { name: 'Sony', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg' },
            { name: 'DELL', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Dell_logo_2016.svg' },
            { name: 'ASUS', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg' },
          ];
        }

        this.cdr.markForCheck();
      },
      error: () => {
        console.error('Failed to load brands');
        this.cdr.markForCheck();
      },
    });
  }

  navigateToBrand(brand: any) {
    if (!brand.id) return;
    // Navigate to products filtered by brand AND the category of that brand (per user request)
    this.router.navigate(['/products'], {
      queryParams: {
        brandId: brand.id,
        categoryId: brand.categoryId
      }
    });
  }

  loadFavorites() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    this.favoriteService.getFavorites().subscribe({
      next: (favs) => {
        this.favoriteProductIds = new Set(favs.map((f) => f.product.id));
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status === 401) {
          this.favoriteProductIds = new Set<number>();
          return;
        }
        console.error('Failed to fetch favorites', err);
      },
    });
  }

  toggleFavorite(product: Product) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      this.message.error('Vui lòng đăng nhập để yêu thích sản phẩm này!');
      this.router.navigate(['/login']);
      return;
    }

    this.favoriteService.toggleFavorite(product.id).subscribe({
      next: (res) => {
        if (res.status === 'added') {
          this.favoriteProductIds.add(product.id);
          this.message.success('Đã thêm vào yêu thích!');
        } else {
          this.favoriteProductIds.delete(product.id);
          this.message.info('Đã xóa khỏi yêu thích');
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.message.error('Vui lòng đăng nhập để yêu thích sản phẩm');
      },
    });
  }

  isFavorite(productId: number): boolean {
    return this.favoriteProductIds.has(productId);
  }

  addToCart(product: Product) {
    if (product.attributes && product.attributes.length > 0) {
      // Products with variants MUST be selected on detail page
      this.message.info('Vui lòng chọn Màu sắc/Dung lượng tại trang chi tiết');
      this.router.navigate(['/product', product.id]);
      return;
    }

    this.cartService.addToCart(product.id, 1).subscribe({
      next: () => {
        this.message.success('Đã thêm sản phẩm vào giỏ hàng!');
      },
      error: () => {
        this.message.error('Vui lòng đăng nhập để mua hàng');
      },
    });
  }

  buyNow(product: Product) {
    if (product.attributes && product.attributes.length > 0) {
      this.router.navigate(['/product', product.id]);
      return;
    }

    this.cartService.addToCart(product.id, 1).subscribe({
      next: () => {
        this.router.navigate(['/cart']);
      },
      error: () => {
        this.message.error('Vui lòng đăng nhập để tiếp tục');
      },
    });
  }

  getDiscountPercent(product: Product): number {
    if (!product.originalPrice || product.originalPrice <= product.price) return 0;
    return Math.round(100 - (product.price * 100) / product.originalPrice);
  }
}
