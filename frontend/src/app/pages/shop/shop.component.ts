import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ShopService } from '../../core/services/shop.service';
import { ProductService, Product } from '../../core/services/product.service';
import { ChatService } from '../../core/services/chat.service';
import { ShopCategoryService } from '../../core/services/shop-category.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzMenuModule } from 'ng-zorro-antd/menu';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, RouterLink, NzButtonModule, NzIconModule, NzGridModule, NzMenuModule],
  template: `
    <div class="shop-page" *ngIf="shop && !loading">
      
      <!-- Premium Glass Header -->
      <div class="shop-header-wrapper" [style.background-image]="'url(' + getFullUrl(shop.coverImage, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80') + ')'">
        <div class="header-glass-overlay">
          <div class="header-main-content">
            <div class="shop-brand">
              <div class="logo-container">
                <img [src]="getFullUrl(shop.logo, 'assets/default-shop.png')" class="shop-logo" />
                <div class="mall-badge" *ngIf="shop.isMall">Mall</div>
              </div>
              <div class="brand-info">
                <h1>{{ shop.name }}</h1>
                <p class="description">{{ shop.description }}</p>
                <div class="stats-pills">
                  <span class="pill"><i nz-icon nzType="star" nzTheme="fill"></i> {{ shopStats.avgRating.toFixed(1) }} / 5.0</span>
                  <span class="pill"><i nz-icon nzType="user"></i> {{ shop.followerCount }} Follower</span>
                  <span class="pill"><i nz-icon nzType="appstore"></i> {{ shopStats.totalProducts }} Sản phẩm</span>
                </div>
              </div>
            </div>
            
            <div class="action-buttons">
              <button class="follow-btn" [class.following]="following" (click)="followShop()" [disabled]="followLoading">
                <span nz-icon [nzType]="followLoading ? 'loading' : (following ? 'check' : 'plus')"></span>
                {{ following ? 'Đang theo dõi' : 'Theo dõi' }}
              </button>
              <button class="chat-btn-premium" (click)="chatWithSeller()">
                <span nz-icon nzType="message" nzTheme="outline"></span> Chat Ngay
              </button>
            </div>
          </div>
          
          <div class="header-stats-bar">
             <div class="stat-item">
                <span class="label">Đánh giá shop</span>
                <span class="value"><i nz-icon nzType="star" nzTheme="fill"></i> {{ shopStats.avgRating.toFixed(1) }} / 5.0 ({{ shopStats.totalReviews }} đánh giá)</span>
             </div>
             <div class="stat-divider"></div>
             <div class="stat-item">
                <span class="label">Sản phẩm</span>
                <span class="value">{{ shopStats.totalProducts }}</span>
             </div>
             <div class="stat-divider"></div>
             <div class="stat-item">
                <span class="label">Tỉ lệ phản hồi</span>
                <span class="value">99%</span>
             </div>
          </div>
        </div>
      </div>

      <div class="shop-content-with-sidebar">
        <!-- Sidebar Categories -->
        <div class="shop-sidebar">
          <ul nz-menu nzMode="inline" class="cat-menu">
             <li nz-menu-item [nzSelected]="!selectedCatId && !selectedStdCatId" (click)="selectCategory(null, 'all')">Tất cả sản phẩm</li>
             
             <!-- Custom Shop Categories -->
             <ng-container *ngIf="shopCategories.length > 0">
               <li nz-menu-group nzTitle="Danh mục Shop">
                 <ul>
                   <li nz-menu-item *ngFor="let cat of shopCategories" 
                       [nzSelected]="selectedCatId === cat.id" 
                       (click)="selectCategory(cat.id, 'shop')">
                      {{ cat.name }}
                   </li>
                 </ul>
               </li>
             </ng-container>

             <!-- Standard Categories from Products -->
             <ng-container *ngIf="standardCategories.length > 0">
               <li nz-menu-group nzTitle="Loại sản phẩm">
                 <ul>
                   <li nz-menu-item *ngFor="let cat of standardCategories" 
                       [nzSelected]="selectedStdCatId === cat.id" 
                       (click)="selectCategory(cat.id, 'standard')">
                      {{ cat.name }}
                   </li>
                 </ul>
               </li>
             </ng-container>
          </ul>
        </div>
        
        <!-- Products Grid -->
        <div class="shop-products-container">
          <div class="section-header">
            <h3>Sản phẩm {{ selectedCatName ? selectedCatName : 'Gợi ý' }}</h3>
            <span class="count">{{ filteredProducts.length }} mặt hàng</span>
          </div>
          <div nz-row [nzGutter]="[20, 20]">
            <div nz-col [nzXs]="24" [nzSm]="12" [nzMd]="8" [nzLg]="6" *ngFor="let product of filteredProducts">
              <div class="premium-product-card" [routerLink]="['/product', product.id]">
                <div class="img-wrapper">
                  <img [src]="product.image ? (product.image.startsWith('http') ? product.image : 'https://nestjs-zvmg.onrender.com' + product.image) : 'assets/default-product.png'" />
                  <div class="rating-tag" *ngIf="product.rating > 0">
                    <span nz-icon nzType="star" nzTheme="fill"></span> {{ product.rating }}
                  </div>
                </div>
                <div class="card-body">
                  <h4>{{ product.name }}</h4>
                  <div class="price-row">
                    <span class="price-val">{{ product.price | number:'1.0-0' }}đ</span>
                    <span class="sold-val">Đã bán {{ product.soldCount || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="filteredProducts.length === 0" class="empty-state">
            <div class="empty-icon">📦</div>
            <p>Không có sản phẩm nào trong danh mục này.</p>
          </div>
        </div>
      </div>
    </div>

    <div *ngIf="loading" class="loading-full">
      <div class="loader"></div>
      <p>Đang tải gian hàng...</p>
    </div>
  `,
  styles: [`
    .shop-page { max-width: 1440px; margin: 0 auto; padding: var(--space-6); font-family: var(--font-body); }
    
    .shop-header-wrapper { 
      height: 380px; 
      border-radius: var(--radius-xl); 
      margin-bottom: var(--space-8); 
      background-size: cover; 
      background-position: center; 
      position: relative; 
      overflow: hidden; 
      box-shadow: var(--shadow-card); 
    }
    
    .header-glass-overlay { 
      position: absolute; 
      inset: 0; 
      background: linear-gradient(to bottom, oklch(0 0 0 / 0.1), oklch(0.14 0.02 258 / 0.9)); 
      backdrop-filter: blur(4px); 
      display: flex; 
      flex-direction: column; 
      justify-content: flex-end; 
      padding: var(--space-8); 
    }
    
    .header-main-content { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: var(--space-6); }
    
    .shop-brand { display: flex; gap: var(--space-6); align-items: center; }
    
    .logo-container { position: relative; }
    .shop-logo { width: 110px; height: 110px; border-radius: var(--radius-lg); border: 2px solid oklch(1 0 0 / 0.2); object-fit: cover; }
    .mall-badge { position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); background: var(--color-danger); color: var(--color-surface-raised); padding: 4px 10px; border-radius: var(--radius-sm); font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
    
    .brand-info h1 { color: var(--color-surface-raised); margin: 0 0 8px; font-family: var(--font-display); font-size: 2.2rem; font-weight: 900; letter-spacing: -0.02em; }
    .brand-info .description { color: oklch(0.9 0.01 255); font-size: 0.95rem; max-width: 500px; line-height: 1.5; margin-bottom: 12px; }
    
    .stats-pills { display: flex; gap: 12px; }
    .pill { background: oklch(1 0 0 / 0.15); backdrop-filter: blur(10px); color: var(--color-surface-raised); padding: 6px 16px; border-radius: var(--radius-pill); font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 6px; }
    .pill i { color: var(--color-accent); }
    
    .action-buttons { display: flex; gap: var(--space-3); }
    .follow-btn, .chat-btn-premium { padding: 12px 24px; border-radius: var(--radius-pill); font-weight: 800; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; transition: all var(--duration-fast); display: flex; align-items: center; gap: 8px; }
    
    .follow-btn { background: var(--color-surface-raised); color: var(--color-text-primary); border: none; }
    .follow-btn.following { background: oklch(1 0 0 / 0.25); color: var(--color-surface-raised); border: 1px solid oklch(1 0 0 / 0.3); }
    .follow-btn:hover { background: var(--color-surface-sunken); transform: translateY(-2px); }
    
    .chat-btn-premium { background: var(--color-accent); color: var(--color-text-primary); border: none; }
    .chat-btn-premium:hover { background: var(--color-accent-hover); transform: translateY(-2px); box-shadow: var(--shadow-accent); }

    .header-stats-bar { 
      background: oklch(1 0 0 / 0.1); 
      border-top: 1px solid oklch(1 0 0 / 0.1); 
      padding-top: var(--space-4); 
      margin-top: var(--space-3); 
      display: flex; 
      gap: var(--space-12); 
      padding-left: var(--space-6);
      padding-bottom: var(--space-4);
    }
    .stat-item { display: flex; flex-direction: column; }
    .stat-item .label { color: oklch(0.9 0.01 255); font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    .stat-item .value { color: var(--color-surface-raised); font-family: var(--font-display); font-weight: 900; font-size: 1.2rem; }
    .stat-item .value i { color: var(--color-accent); }
    .stat-divider { width: 1px; height: 36px; background: oklch(1 0 0 / 0.2); }

    .shop-content-with-sidebar { display: flex; gap: var(--space-8); align-items: flex-start; }
    .shop-sidebar { width: 280px; background: var(--color-surface-raised); border-radius: var(--radius-lg); padding: var(--space-4); box-shadow: var(--shadow-card); flex-shrink: 0; position: sticky; top: 100px; border: 1px solid var(--color-border); }
    
    ::ng-deep .shop-sidebar .ant-menu { border-inline-end: none !important; background: transparent; }
    ::ng-deep .shop-sidebar .ant-menu-item { font-weight: 700; color: var(--color-text-secondary); border-radius: var(--radius-md); }
    ::ng-deep .shop-sidebar .ant-menu-item-selected { background: var(--color-surface-sunken) !important; color: var(--color-text-primary) !important; font-weight: 800; }
    ::ng-deep .shop-sidebar .ant-menu-item-group-title { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-text-tertiary); padding: var(--space-4) var(--space-4) var(--space-2); }

    .shop-products-container { flex: 1; min-width: 0; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6); }
    .section-header h3 { font-family: var(--font-display); font-size: 1.6rem; font-weight: 900; color: var(--color-text-primary); margin: 0; letter-spacing: -0.02em; }
    .section-header .count { color: var(--color-text-tertiary); font-weight: 700; font-size: 0.9rem; }

    .premium-product-card { background: var(--color-surface-raised); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-card); transition: all var(--duration-base) var(--ease-out-quart); cursor: pointer; border: 1px solid var(--color-border); height: 100%; display: flex; flex-direction: column; }
    .premium-product-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); border-color: var(--color-border-strong); }
    
    .img-wrapper { position: relative; width: 100%; aspect-ratio: 1/1; background: var(--color-surface-sunken); padding: var(--space-4); }
    .img-wrapper img { width: 100%; height: 100%; object-fit: contain; transition: transform var(--duration-base) var(--ease-out-quart); }
    .premium-product-card:hover .img-wrapper img { transform: scale(1.05); }
    .rating-tag { position: absolute; bottom: 10px; right: 10px; background: var(--color-surface-raised); padding: 4px 10px; border-radius: var(--radius-pill); font-weight: 800; font-size: 0.8rem; display: flex; align-items: center; gap: 4px; color: var(--color-text-primary); box-shadow: var(--shadow-card); }
    .rating-tag span { color: var(--color-accent); font-size: 1rem; }
    
    .card-body { padding: var(--space-4); display: flex; flex-direction: column; flex: 1; }
    .card-body h4 { font-size: 0.95rem; font-weight: 800; color: var(--color-text-primary); margin-bottom: var(--space-3); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex: 1; }
    
    .price-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; }
    .price-val { color: var(--color-danger); font-family: var(--font-display); font-weight: 900; font-size: 1.15rem; }
    .sold-val { font-size: 0.75rem; color: var(--color-text-secondary); font-weight: 700; }

    .loading-full { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; color: var(--color-text-secondary); font-weight: 600; }
    .loader { width: 44px; height: 44px; border: 4px solid var(--color-surface-sunken); border-top-color: var(--color-text-primary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .empty-state { text-align: center; padding: 80px; color: var(--color-text-tertiary); font-weight: 600; font-size: 1rem; }
    .empty-icon { font-size: 4.5rem; margin-bottom: 20px; opacity: 0.4; }
  `]
})
export class ShopComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private shopService = inject(ShopService);
  private productService = inject(ProductService);
  private chatService = inject(ChatService);
  private shopCategoryService = inject(ShopCategoryService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);

  shop: any = null;
  shopStats: any = { avgRating: 0, totalProducts: 0, totalReviews: 0 };
  products: Product[] = [];
  filteredProducts: Product[] = [];
  shopCategories: any[] = [];
  standardCategories: any[] = [];
  selectedCatId: number | null = null;
  selectedStdCatId: number | null = null;
  selectedCatName: string = '';
  loading = true;
  following = false;
  followLoading = false;

  ngOnInit() {
    this.route.params.subscribe(params => {
      const sellerId = +params['sellerId'];
      if (sellerId) {
        this.loadShopAndProducts(sellerId);
      }
    });
  }

  loadShopAndProducts(sellerId: number) {
    // Wrap to avoid NG0100 ExpressionChangedAfterItHasBeenCheckedError
    Promise.resolve().then(() => {
      this.loading = true;
      this.cdr.markForCheck();
    });

    (this.shopService as any).getShopBySeller(sellerId).subscribe({
      next: (res: any) => {
        this.shop = res;
        this.loading = false;
        this.cdr.detectChanges(); // Trigger immediately for shop UI

        // Load Shop Stats (New)
        this.http.get(`https://nestjs-zvmg.onrender.com/api/shop/stats/${sellerId}`).subscribe({
          next: stats => { this.shopStats = stats; this.cdr.markForCheck(); }
        });

        // Check if following
        this.checkFollowStatus(sellerId);

        // Load custom shop categories
        this.shopCategoryService.findAllByShop(this.shop.id).subscribe({
          next: (cats: any[]) => {
            this.shopCategories = cats;
            this.cdr.markForCheck();
          }
        });

        // Load products by seller's userId
        this.productService.getProducts({ userId: sellerId }).subscribe({
          next: (prods: any) => {
            // Note: getProducts usually returns {data, total, page...} in this backend based on our check
            this.products = prods.data || prods;
            this.filteredProducts = [...this.products];

            // Extract standard categories automatically from products
            const catMap = new Map();
            for (const p of this.products) {
              if (p.category) {
                catMap.set(p.category.id, p.category);
              }
            }
            this.standardCategories = Array.from(catMap.values());
            this.cdr.detectChanges(); // Ensure products render
          },
          error: () => {
            this.products = []; this.filteredProducts = []; this.standardCategories = [];
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.shop = null;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  checkFollowStatus(sellerId: number) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    this.http.get(`https://nestjs-zvmg.onrender.com/api/shop/is-following/${sellerId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => { this.following = res.isFollowing; this.cdr.markForCheck(); }
    });
  }

  followShop() {
    if (!this.shop || this.followLoading) return;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.followLoading = true;
    this.http.post(`https://nestjs-zvmg.onrender.com/api/shop/follow/${this.shop.userId}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.shop.followerCount = res.followerCount;
        this.following = !this.following;
        this.followLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.followLoading = false; }
    });
  }

  getFullUrl(path: string, fallback: string = ''): string {
    if (!path) return fallback;
    if (path.startsWith('http')) return path;
    return `https://nestjs-zvmg.onrender.com${path.startsWith('/') ? '' : '/'}${path}`;
  }

  selectCategory(id: number | null, type: 'all' | 'shop' | 'standard' = 'all') {
    if (type === 'all' || id === null) {
      this.selectedCatId = null;
      this.selectedStdCatId = null;
      this.selectedCatName = '';
      this.filteredProducts = [...this.products];
      return;
    }

    if (type === 'shop') {
      this.selectedCatId = id;
      this.selectedStdCatId = null;
      const cat = this.shopCategories.find(c => c.id === id);
      this.selectedCatName = cat ? `- Danh mục: ${cat.name}` : '';
      this.filteredProducts = this.products.filter((p: any) =>
        p.shopCategories && p.shopCategories.some((sc: any) => sc.id === id)
      );
    } else if (type === 'standard') {
      this.selectedStdCatId = id;
      this.selectedCatId = null;
      const cat = this.standardCategories.find(c => c.id === id);
      this.selectedCatName = cat ? `- Loại: ${cat.name}` : '';
      this.filteredProducts = this.products.filter((p: any) =>
        p.categoryId === id
      );
    }
  }

  chatWithSeller() {
    if (this.shop?.userId) {
      this.chatService.createConversation(this.shop.userId).subscribe({
        next: (convo: any) => {
          this.router.navigate(['/chat'], { queryParams: { id: convo.id } });
        }
      });
    }
  }
}
