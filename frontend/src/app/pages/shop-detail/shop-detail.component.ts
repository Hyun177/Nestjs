import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { ShopService } from '../../core/services/shop.service';
import { ProductService, Product } from '../../core/services/product.service';
import { ChatService } from '../../core/services/chat.service';
import { VndCurrencyPipe } from '../../shared/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-shop-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, VndCurrencyPipe],
  template: `
    <div class="shop-detail-page">
      <!-- Shop Header Banner -->
      <div class="shop-banner" [style.backgroundImage]="'url(' + (shop?.coverImage || 'assets/default-cover.jpg') + ')'">
        <div class="overlay"></div>
        <div class="container banner-content">
          <div class="shop-identity">
            <div class="shop-logo-wrap">
              <img [src]="shop?.logo || 'assets/default-shop.png'" [alt]="shop?.name">
            </div>
            <div class="shop-meta">
              <h1>{{ shop?.name }}</h1>
              <p class="description">{{ shop?.description || 'No description available for this shop.' }}</p>
              <div class="stats-row">
                <div class="stat">
                  <span class="val">{{ shop?.rating || 5.0 }}</span>
                  <span class="lbl">Rating</span>
                </div>
                <div class="stat">
                  <span class="val">{{ shop?.followerCount || 0 }}</span>
                  <span class="lbl">Followers</span>
                </div>
                <div class="stat">
                  <span class="val">{{ products.length }}</span>
                  <span class="lbl">Products</span>
                </div>
              </div>
            </div>
          </div>
          <div class="header-actions">
             <button class="follow-btn">Follow</button>
             <button class="chat-btn" (click)="chatNow()">Chat</button>
          </div>
        </div>
      </div>

      <!-- Shop Content -->
      <div class="container content-section">
        <div class="section-title-wrap">
          <h2>Shop Products</h2>
          <div class="filter-bar">
             <span class="active">All Products</span>
             <span>Categories</span>
             <span>Promo</span>
          </div>
        </div>

        <div class="products-grid" *ngIf="!loading">
          <div *ngFor="let prod of products" class="product-card-premium" [routerLink]="['/product', prod.id]">
             <div class="img-wrap">
                <img [src]="'http://localhost:3000' + prod.image" [alt]="prod.name">
                <div class="badge" *ngIf="prod.originalPrice && prod.originalPrice > prod.price">SALE</div>
             </div>
             <div class="info">
                <h3>{{ prod.name }}</h3>
                <div class="price-row">
                   <span class="price">{{ prod.price | vndCurrency }}</span>
                   <span class="old-price" *ngIf="prod.originalPrice">{{ prod.originalPrice | vndCurrency }}</span>
                </div>
                <div class="meta">
                   <span class="rating">⭐ {{ prod.rating }}</span>
                   <span class="sold">Sold {{ prod.soldCount || 0 }}</span>
                </div>
             </div>
          </div>
        </div>

        <div *ngIf="loading" class="loading-state">
           <div class="spinner"></div>
           <p>Loading products...</p>
        </div>

        <div *ngIf="!loading && products.length === 0" class="empty-state">
           <div class="icon">📦</div>
           <h3>No products found</h3>
           <p>This shop hasn't uploaded any products yet.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .shop-detail-page { min-height: 100vh; background: #f8fafc; }
    .shop-banner {
      height: 320px; background-size: cover; background-position: center;
      position: relative; display: flex; align-items: flex-end; padding-bottom: 40px;
    }
    .shop-banner .overlay {
      position: absolute; inset: 0; 
      background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.8) 100%);
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; position: relative; }
    .banner-content { display: flex; justify-content: space-between; align-items: center; width: 100%; }
    .shop-identity { display: flex; gap: 24px; align-items: center; }
    .shop-logo-wrap {
      width: 120px; height: 120px; border-radius: 24px; background: #fff;
      padding: 10px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    .shop-logo-wrap img { width: 100%; height: 100%; object-fit: cover; border-radius: 16px; }
    .shop-meta h1 { font-size: 32px; font-weight: 850; color: #fff; margin: 0 0 4px; }
    .shop-meta .description { color: rgba(255,255,255,0.7); font-size: 14px; margin-bottom: 12px; max-width: 500px; }
    .stats-row { display: flex; gap: 32px; }
    .stat { display: flex; flex-direction: column; }
    .stat .val { color: #fff; font-weight: 800; font-size: 18px; }
    .stat .lbl { color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    
    .header-actions { display: flex; gap: 12px; }
    .header-actions button {
      padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; border: none; transition: 0.2s;
    }
    .follow-btn { background: #fff; color: #0f172a; }
    .chat-btn { background: rgba(255,255,255,0.2); color: #fff; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3) !important; }

    .content-section { padding-top: 50px; padding-bottom: 100px; }
    .section-title-wrap { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .section-title-wrap h2 { font-size: 24px; font-weight: 800; color: #0f172a; }
    .filter-bar { display: flex; gap: 24px; }
    .filter-bar span { font-weight: 600; color: #64748b; cursor: pointer; font-size: 14px; }
    .filter-bar span.active { color: #0f172a; position: relative; }
    .filter-bar span.active::after {
      content: ''; position: absolute; bottom: -8px; left: 0; width: 20px; height: 3px; background: #0f172a; border-radius: 2px;
    }

    .products-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px;
    }
    .product-card-premium {
      background: #fff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; transition: 0.3s; cursor: pointer;
    }
    .product-card-premium:hover { transform: translateY(-8px); box-shadow: 0 15px 30px rgba(0,0,0,0.1); }
    .img-wrap { width: 100%; height: 220px; background: #f1f5f9; position: relative; }
    .img-wrap img { width: 100%; height: 100%; object-fit: cover; }
    .badge {
      position: absolute; top: 12px; left: 12px; background: #ef4444; color: #fff;
      font-size: 10px; font-weight: 900; padding: 4px 8px; border-radius: 6px;
    }
    .info { padding: 16px; }
    .info h3 { font-size: 15px; font-weight: 700; color: #1e293b; margin: 0 0 8px; height: 40px; overflow: hidden; }
    .price-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .price { font-weight: 800; color: #0f172a; font-size: 16px; }
    .old-price { font-size: 12px; color: #94a3b8; text-decoration: line-through; }
    .meta { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: #64748b; }

    .loading-state, .empty-state { padding: 80px; text-align: center; }
    .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #0f172a; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  `]
})
export class ShopDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private shopService = inject(ShopService);
  private productService = inject(ProductService);
  private chatService = inject(ChatService);
  private router = inject(Router);

  shop: any = null;
  products: Product[] = [];
  loading = true;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadShop(id);
      }
    });
  }

  loadShop(idOrUserId: string) {
    this.loading = true;
    // We try to get shop by userId first since that's what's passed in the routerLink
    this.shopService.getShopBySeller(+idOrUserId).subscribe({
      next: (res) => {
        this.shop = res;
        this.loadProducts(res.id);
      },
      error: () => {
         // If fail, try by shop id directly
         this.shopService.getShopById(+idOrUserId).subscribe(res => {
            this.shop = res;
            this.loadProducts(res.id);
         });
      }
    });
  }

  loadProducts(shopId: number) {
    this.productService.getProducts({ shopId }).subscribe({
      next: (res) => {
        this.products = res;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  chatNow() { 
    if (this.shop?.userId) {
      this.chatService.createConversation(this.shop.userId).subscribe(() => {
        this.router.navigate(['/chat']);
      });
    }
  }
}
