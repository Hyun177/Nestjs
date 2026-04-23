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
                <img [src]="'https://nestjs-zvmg.onrender.com' + prod.image" [alt]="prod.name">
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
    .shop-detail-page { min-height: 100vh; background: var(--color-surface-base); font-family: var(--font-body); }
    .shop-banner {
      height: 360px; background-size: cover; background-position: center;
      position: relative; display: flex; align-items: flex-end; padding-bottom: var(--space-8);
    }
    .shop-banner .overlay {
      position: absolute; inset: 0; 
      background: linear-gradient(180deg, oklch(0 0 0 / 0.1) 0%, oklch(0.14 0.02 258 / 0.95) 100%);
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 var(--space-6); position: relative; }
    .banner-content { display: flex; justify-content: space-between; align-items: flex-end; width: 100%; flex-wrap: wrap; gap: var(--space-4); }
    .shop-identity { display: flex; gap: var(--space-6); align-items: center; }
    .shop-logo-wrap {
      width: 130px; height: 130px; border-radius: var(--radius-xl); background: var(--color-surface-raised);
      padding: 8px; overflow: hidden; box-shadow: 0 16px 32px oklch(0 0 0 / 0.4);
    }
    .shop-logo-wrap img { width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-lg); }
    .shop-meta h1 { font-family: var(--font-display); font-size: 2.5rem; font-weight: 900; color: #fff; margin: 0 0 8px; letter-spacing: -0.02em; }
    .shop-meta .description { color: oklch(0.9 0.02 255); font-size: 0.9rem; font-weight: 500; margin-bottom: 16px; max-width: 500px; }
    .stats-row { display: flex; gap: var(--space-8); }
    .stat { display: flex; flex-direction: column; }
    .stat .val { color: #fff; font-family: var(--font-display); font-weight: 900; font-size: 1.4rem; }
    .stat .lbl { color: oklch(0.7 0.05 255); font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    
    .header-actions { display: flex; gap: var(--space-3); }
    .header-actions button {
      padding: 12px 28px; border-radius: var(--radius-pill); font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; border: none; transition: all var(--duration-fast);
    }
    .follow-btn { background: var(--color-surface-raised); color: var(--color-text-primary); }
    .follow-btn:hover { background: var(--color-accent); transform: translateY(-2px); }
    .chat-btn { background: oklch(1 0 0 / 0.15); color: #fff; backdrop-filter: blur(10px); border: 1px solid oklch(1 0 0 / 0.3) !important; }
    .chat-btn:hover { background: oklch(1 0 0 / 0.25); transform: translateY(-2px); }

    .content-section { padding-top: var(--space-12); padding-bottom: 100px; }
    .section-title-wrap { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-8); }
    .section-title-wrap h2 { font-family: var(--font-display); font-size: 1.8rem; font-weight: 900; color: var(--color-text-primary); letter-spacing: -0.02em; }
    .filter-bar { display: flex; gap: var(--space-6); }
    .filter-bar span { font-weight: 700; color: var(--color-text-tertiary); cursor: pointer; font-size: 0.9rem; transition: color var(--duration-fast); }
    .filter-bar span:hover { color: var(--color-text-primary); }
    .filter-bar span.active { color: var(--color-text-primary); position: relative; }
    .filter-bar span.active::after {
      content: ''; position: absolute; bottom: -8px; left: 0; width: 20px; height: 3px; background: var(--color-text-primary); border-radius: 2px;
    }

    .products-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-6);
    }
    .product-card-premium {
      background: var(--color-surface-raised); border-radius: var(--radius-lg); border: 1px solid var(--color-border); overflow: hidden; transition: all var(--duration-base) var(--ease-out-quart); cursor: pointer;
    }
    .product-card-premium:hover { transform: translateY(-6px); box-shadow: var(--shadow-hover); border-color: var(--color-border-strong); }
    .img-wrap { width: 100%; height: 260px; background: var(--color-surface-sunken); position: relative; padding: var(--space-4); }
    .img-wrap img { width: 100%; height: 100%; object-fit: contain; transition: transform var(--duration-base) var(--ease-out-quart); }
    .product-card-premium:hover .img-wrap img { transform: scale(1.05); }
    .badge {
      position: absolute; top: 12px; left: 12px; background: var(--color-danger); color: #fff;
      font-size: 0.7rem; font-weight: 900; padding: 4px 10px; border-radius: var(--radius-pill); z-index: 10;
    }
    .info { padding: var(--space-4); }
    .info h3 { font-size: 1rem; font-weight: 800; color: var(--color-text-primary); margin: 0 0 10px; height: 44px; overflow: hidden; }
    .price-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
    .price { font-family: var(--font-display); font-weight: 900; color: var(--color-danger); font-size: 1.2rem; }
    .old-price { font-size: 0.85rem; font-weight: 600; color: var(--color-text-tertiary); text-decoration: line-through; }
    .meta { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }

    .loading-state, .empty-state { padding: 80px; text-align: center; }
    .spinner { width: 48px; height: 48px; border: 4px solid var(--color-border); border-top: 4px solid var(--color-text-primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .empty-state .icon { font-size: 4rem; margin-bottom: var(--space-4); opacity: 0.3; }
    .empty-state h3 { font-family: var(--font-display); font-size: 1.6rem; font-weight: 900; color: var(--color-text-primary); margin-bottom: 8px; }
    .empty-state p { color: var(--color-text-secondary); font-weight: 500; font-size: 1rem; }
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
