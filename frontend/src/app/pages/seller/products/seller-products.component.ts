import { Component, OnInit, inject, signal, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { VndCurrencyPipe } from '../../../shared/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-seller-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzIconModule, NzPopconfirmModule, VndCurrencyPipe],
  template: `
    <div class="seller-products">
      <div class="page-header">
        <div class="title-wrap">
          <h2>Sản phẩm của tôi</h2>
          <p>Quản lý toàn bộ sản phẩm trong cửa hàng của bạn</p>
        </div>
        <a routerLink="/seller/product-upload" class="seller-btn seller-btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Đăng sản phẩm mới
        </a>
      </div>

      <!-- Search & Filter -->
      <div class="filter-bar">
        <input type="text" [(ngModel)]="searchValue" placeholder="🔍  Tìm tên sản phẩm..." class="search-input" />
        <select [(ngModel)]="statusFilter" class="filter-select">
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="archived">Đã ẩn</option>
        </select>
        <div class="total-badge">Tổng: <strong>{{ filteredProducts.length }}</strong> sản phẩm</div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="loading-state">
        <div class="spinner"></div>
        <p>Đang tải sản phẩm...</p>
      </div>

      <!-- Products Grid -->
      <div *ngIf="!loading()" class="products-grid">
        <div class="product-card" *ngFor="let p of filteredProducts">
          <div class="product-img-wrap">
            <img *ngIf="getImg(p)" [src]="getImg(p)" [alt]="p.name" class="product-img" />
            <div *ngIf="!getImg(p)" class="product-img-placeholder">{{ p.name?.charAt(0) }}</div>
            <span class="status-tag" [class.archived]="p.isArchived">
              {{ p.isArchived ? 'Đã ẩn' : 'Đang bán' }}
            </span>
          </div>
          <div class="product-body">
            <h4 class="product-name">{{ p.name }}</h4>
            <div class="product-meta-row">
              <span class="product-price">{{ p.price | vndCurrency }}</span>
              <span class="product-stock" [class.low]="p.stock < 10">Tồn: {{ p.stock }}</span>
            </div>
            <div class="product-stats">
              <span>🛒 Đã bán: {{ p.soldCount || 0 }}</span>
              <span>⭐ {{ p.rating || 0 | number:'1.1-1' }}</span>
            </div>
            <div class="product-category">{{ p.category?.name || '—' }}</div>
          </div>
          <div class="product-actions">
            <button class="seller-btn seller-btn-default" style="flex: 1; padding: 6px; font-size: 0.8rem; color: #6366f1" title="Chỉnh sửa" (click)="editProduct(p)">
              <span nz-icon nzType="edit"></span> Sửa
            </button>
            <button class="seller-btn seller-btn-default" style="flex: 1; padding: 6px; font-size: 0.8rem;" (click)="toggleArchive(p)" title="{{ p.isArchived ? 'Hiện' : 'Ẩn' }}">
              <span nz-icon [nzType]="p.isArchived ? 'eye' : 'eye-invisible'"></span>
              {{ p.isArchived ? 'Hiện' : 'Ẩn' }}
            </button>
            <button class="seller-btn seller-btn-danger seller-btn-icon-only" nz-popconfirm nzPopconfirmTitle="Xóa sản phẩm này?"
              (nzOnConfirm)="deleteProduct(p.id)">
              <span nz-icon nzType="delete"></span>
            </button>
          </div>
        </div>

        <div class="empty-state" *ngIf="filteredProducts.length === 0">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          <p>Chưa có sản phẩm nào</p>
          <a routerLink="/seller/product-upload">Đăng sản phẩm đầu tiên →</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .seller-products { max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .title-wrap h2 { font-size: 1.7rem; font-weight: 800; color: #0f172a; margin: 0; }
    .title-wrap p { color: #64748b; font-size: 0.875rem; margin: 4px 0 0; }

    .filter-bar { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; background: #fff; padding: 14px 16px; border-radius: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; }
    .search-input { flex: 1; padding: 10px 16px; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 0.875rem; outline: none; background: #f8fafc; }
    .search-input:focus { border-color: #f59e0b; background: #fff; }
    .filter-select { padding: 10px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 0.875rem; outline: none; background: #f8fafc; cursor: pointer; }
    .total-badge { font-size: 0.85rem; color: #64748b; white-space: nowrap; }
    .total-badge strong { color: #0f172a; }

    .loading-state { display: flex; flex-direction: column; align-items: center; padding: 60px; color: #94a3b8; }
    .spinner { width: 36px; height: 36px; border: 4px solid #f1f5f9; border-top-color: #f59e0b; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 14px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
    .product-card { background: #fff; border-radius: 18px; border: 1px solid #f1f5f9; box-shadow: 0 4px 16px rgba(0,0,0,0.04); overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; }
    .product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }

    .product-img-wrap { position: relative; height: 180px; background: #f8fafc; }
    .product-img { width: 100%; height: 100%; object-fit: cover; }
    .product-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: 800; color: #cbd5e1; background: linear-gradient(135deg, #f8fafc, #f1f5f9); }
    .status-tag { position: absolute; top: 10px; right: 10px; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; background: #d1fae5; color: #10b981; }
    .status-tag.archived { background: #fee2e2; color: #ef4444; }

    .product-body { padding: 14px 16px; flex: 1; }
    .product-name { margin: 0 0 8px; font-size: 0.9rem; font-weight: 700; color: #0f172a; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .product-meta-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .product-price { font-weight: 800; color: #ef4444; font-size: 0.95rem; }
    .product-stock { font-size: 0.75rem; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 20px; }
    .product-stock.low { background: #fef3c7; color: #d97706; }
    .product-stats { font-size: 0.75rem; color: #94a3b8; display: flex; gap: 10px; margin-bottom: 6px; }
    .product-category { font-size: 0.72rem; color: #a855f7; font-weight: 600; }
    .product-actions { padding: 10px 16px 14px; display: flex; gap: 8px; border-top: 1px solid #f8fafc; }

    .empty-state { grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; padding: 80px; color: #94a3b8; gap: 12px; }
    .empty-state p { font-size: 1rem; margin: 0; }
    .empty-state a { color: #6366f1; font-weight: 600; text-decoration: none; }
  `]
})
export class SellerProductsComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(true);
  products = signal<any[]>([]);
  searchValue = '';
  statusFilter = 'all';

  private getHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') || '' : '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private getSellerId(): number | null {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || user.userId || null;
    } catch { return null; }
  }

  ngOnInit() { this.loadProducts(); }

  loadProducts() {
    this.loading.set(true);
    const userId = this.getSellerId();
    const url = userId
      ? `https://nestjs-zvmg.onrender.com/api/product?userId=${userId}&showAll=true&limit=200`
      : `https://nestjs-zvmg.onrender.com/api/product?showAll=true&limit=200`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        this.products.set(list);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => { this.products.set([]); this.loading.set(false); }
    });
  }

  get filteredProducts() {
    const s = this.searchValue.toLowerCase();
    return this.products().filter(p => {
      const matchSearch = !s || p.name?.toLowerCase().includes(s);
      const matchStatus = this.statusFilter === 'all'
        || (this.statusFilter === 'archived' && p.isArchived)
        || (this.statusFilter === 'active' && !p.isArchived);
      return matchSearch && matchStatus;
    });
  }

  getImg(p: any): string {
    if (!p?.image) return '';
    if (p.image.startsWith('http')) return p.image;
    return `https://nestjs-zvmg.onrender.com${p.image.startsWith('/') ? p.image : '/' + p.image}`;
  }

  editProduct(p: any) {
    this.router.navigate(['/seller/product-upload'], { queryParams: { id: p.id } });
  }

  toggleArchive(p: any) {
    this.http.put(`https://nestjs-zvmg.onrender.com/api/product/seller/${p.id}/archive`,
      { isArchived: !p.isArchived },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.message.success(p.isArchived ? 'Đã hiện sản phẩm' : 'Đã ẩn sản phẩm');
        this.loadProducts();
      },
      error: () => this.message.error('Không thể cập nhật trạng thái')
    });
  }

  deleteProduct(id: number) {
    this.http.delete(`https://nestjs-zvmg.onrender.com/api/product/${id}`, { headers: this.getHeaders() }).subscribe({
      next: () => { this.message.success('Đã xóa sản phẩm'); this.loadProducts(); },
      error: () => this.message.error('Không thể xóa sản phẩm này')
    });
  }
}
