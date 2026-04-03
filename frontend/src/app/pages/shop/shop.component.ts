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
                  <span class="pill"><i nz-icon nzType="star" nzTheme="fill"></i> {{ shopStats.avgRating }} / 5.0</span>
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
                <span class="value">{{ shopStats.avgRating }} ({{ shopStats.totalReviews }} đánh giá)</span>
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
                  <img [src]="product.image ? (product.image.startsWith('http') ? product.image : 'http://localhost:3000' + product.image) : 'assets/default-product.png'" />
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
    .shop-page { max-width: 1300px; margin: 0 auto; padding: 20px; }
    
    .shop-header-wrapper { 
      height: 350px; 
      border-radius: 24px; 
      margin-bottom: 30px; 
      background-size: cover; 
      background-position: center; 
      position: relative; 
      overflow: hidden; 
      box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
    }
    
    .header-glass-overlay { 
      position: absolute; 
      inset: 0; 
      background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7)); 
      backdrop-filter: blur(4px); 
      display: flex; 
      flex-direction: column; 
      justify-content: flex-end; 
      padding: 40px; 
    }
    
    .header-main-content { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
    
    .shop-brand { display: flex; gap: 24px; align-items: center; }
    
    .logo-container { position: relative; }
    .shop-logo { width: 100px; height: 100px; border-radius: 20px; border: 4px solid rgba(255,255,255,0.2); object-fit: cover; }
    .mall-badge { position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); background: #ff4d4f; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
    
    .brand-info h1 { color: white; margin: 0 0 8px; font-size: 2.2rem; font-weight: 900; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
    .brand-info .description { color: rgba(255,255,255,0.8); font-size: 1rem; max-width: 500px; line-height: 1.4; margin-bottom: 12px; }
    
    .stats-pills { display: flex; gap: 12px; }
    .pill { background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); color: white; padding: 4px 14px; border-radius: 50px; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .pill i { color: #f59e0b; }
    
    .action-buttons { display: flex; gap: 12px; }
    .follow-btn, .chat-btn-premium { padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 8px; }
    
    .follow-btn { background: white; color: #1e293b; border: none; }
    .follow-btn.following { background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); }
    .follow-btn:hover { background: #f8fafc; transform: translateY(-2px); }
    
    .chat-btn-premium { background: #ff4d4f; color: white; border: none; }
    .chat-btn-premium:hover { background: #ff7875; transform: translateY(-2px); }

    .header-stats-bar { 
      background: rgba(255,255,255,0.1); 
      border-top: 1px solid rgba(255,255,255,0.1); 
      padding-top: 20px; 
      margin-top: 10px; 
      display: flex; 
      gap: 40px; 
    }
    .stat-item { display: flex; flex-direction: column; }
    .stat-item .label { color: rgba(255,255,255,0.6); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; }
    .stat-item .value { color: white; font-weight: 700; font-size: 1.1rem; }
    .stat-divider { width: 1px; height: 30px; background: rgba(255,255,255,0.1); }

    .shop-content-with-sidebar { display: flex; gap: 30px; }
    .shop-sidebar { width: 260px; background: white; border-radius: 20px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); flex-shrink: 0; }
    
    .shop-products-container { flex: 1; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .section-header h3 { font-size: 1.4rem; font-weight: 800; margin: 0; }
    .section-header .count { color: #64748b; font-weight: 600; }

    .premium-product-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px rgba(0,0,0,0.05); transition: 0.3s; cursor: pointer; border: 1px solid #f1f5f9; height: 100%; }
    .premium-product-card:hover { transform: translateY(-8px); box-shadow: 0 20px 25px rgba(0,0,0,0.1); }
    
    .img-wrapper { position: relative; width: 100%; height: 200px; }
    .img-wrapper img { width: 100%; height: 100%; object-fit: cover; }
    .rating-tag { position: absolute; bottom: 10px; right: 10px; background: rgba(255,255,255,0.9); padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 12px; display: flex; align-items: center; gap: 4px; color: #1e293b; }
    .rating-tag span { color: #f59e0b; }
    
    .card-body { padding: 16px; }
    .card-body h4 { font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 12px; height: 40px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    
    .price-row { display: flex; justify-content: space-between; align-items: center; }
    .price-val { color: #ef4444; font-weight: 900; font-size: 1.1rem; }
    .sold-val { font-size: 11px; color: #64748b; font-weight: 600; border-left: 1px solid #e2e8f0; padding-left: 8px; }

    .loading-full { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; }
    .loader { width: 40px; height: 40px; border: 4px solid #f1f5f9; border-top-color: #ef4444; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .empty-state { text-align: center; padding: 80px; }
    .empty-icon { font-size: 4rem; margin-bottom: 20px; }
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
        this.http.get(`http://localhost:3000/api/shop/stats/${sellerId}`).subscribe({
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
    this.http.get(`http://localhost:3000/api/shop/is-following/${sellerId}`, {
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
    this.http.post(`http://localhost:3000/api/shop/follow/${this.shop.userId}`, {}, {
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
    return `http://localhost:3000${path.startsWith('/') ? '' : '/'}${path}`;
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
