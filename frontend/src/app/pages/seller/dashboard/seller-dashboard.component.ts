import {
  Component, OnInit, OnDestroy, AfterViewInit,
  inject, signal, ChangeDetectorRef, PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { VndCurrencyPipe } from '../../../shared/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, VndCurrencyPipe],
  template: `
    <div class="seller-dash">
      <!-- Welcome Banner -->
      <div class="welcome-banner">
        <div class="welcome-text">
          <h1>Chào mừng trở lại! 👋</h1>
          <p>Đây là tổng quan hoạt động cửa hàng của bạn hôm nay.</p>
        </div>
        <div class="banner-date">{{ today | date:'EEEE, dd/MM/yyyy':'':'vi' }}</div>
      </div>

      <!-- Stat Cards -->
      <div class="stats-grid">
        <div class="stat-card" *ngFor="let card of statCards">
          <div class="stat-icon" [style.background]="card.bgColor">
            <span [style.color]="card.color" [innerHTML]="card.svgIcon"></span>
          </div>
          <div class="stat-body">
            <p class="stat-label">{{ card.title }}</p>
            <h3 class="stat-value">
              <ng-container *ngIf="card.key === 'revenue'; else plain">
                {{ getStatValue(card.key) | vndCurrency }}
              </ng-container>
              <ng-template #plain>{{ getStatValue(card.key) }}</ng-template>
            </h3>
            <span class="stat-unit">{{ card.unit }}</span>
          </div>
          <div class="stat-trend positive">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-row">
        <div class="chart-card wide">
          <div class="card-header">
            <h3>Doanh thu theo tháng</h3>
          </div>
          <div class="chart-body">
            <canvas id="sellerSalesChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="card-header">
            <h3>Trạng thái đơn hàng</h3>
          </div>
          <div class="chart-body">
            <canvas id="sellerStatusChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Recent Orders Table -->
      <div class="table-card">
        <div class="card-header">
          <h3>Đơn hàng gần đây</h3>
          <a routerLink="/seller/orders" class="view-all-btn">Xem tất cả →</a>
        </div>
        <div *ngIf="loading()" class="loading-state">
          <div class="spinner"></div>
          <span>Đang tải dữ liệu...</span>
        </div>
        <div *ngIf="!loading()" class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Tổng tiền</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let o of recentOrders()">
                <td><span class="order-code">{{ o.orderCode }}</span></td>
                <td>{{ o.customerName }}</td>
                <td><strong>{{ o.totalAmount | vndCurrency }}</strong></td>
                <td>{{ o.date }}</td>
                <td>
                  <span class="status-badge" [style.background]="getStatusCfg(o.status).bg" [style.color]="getStatusCfg(o.status).color">
                    {{ getStatusCfg(o.status).label }}
                  </span>
                </td>
              </tr>
              <tr *ngIf="recentOrders().length === 0">
                <td colspan="5" class="empty-row">Chưa có đơn hàng nào</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Bottom Row: Top Products + Quick Links -->
      <div class="bottom-row">
        <div class="table-card half">
          <div class="card-header">
            <h3>Sản phẩm bán chạy</h3>
            <a routerLink="/seller/products" class="view-all-btn">Xem tất cả →</a>
          </div>
          <div *ngIf="!loading()" class="product-list">
            <div class="product-item" *ngFor="let p of topProducts(); let i = index">
              <span class="rank" [class.gold]="i===0" [class.silver]="i===1" [class.bronze]="i===2">{{ i+1 }}</span>
              <img *ngIf="getProductImg(p)" [src]="getProductImg(p)" class="product-thumb" />
              <div class="product-avatar" *ngIf="!getProductImg(p)">{{ p.name?.charAt(0) }}</div>
              <div class="product-info">
                <span class="product-name">{{ p.name }}</span>
                <span class="product-meta">Đã bán: {{ p.soldCount || 0 }}</span>
              </div>
              <span class="product-price">{{ p.price | vndCurrency }}</span>
            </div>
            <div *ngIf="topProducts().length === 0" class="empty-row">Chưa có sản phẩm</div>
          </div>
        </div>

        <div class="table-card half">
          <div class="card-header"><h3>Truy cập nhanh</h3></div>
          <div class="quick-links">
            <a routerLink="/seller/product-upload" class="quick-link-item">
              <div class="ql-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <div><p>Đăng sản phẩm mới</p><span>Tải sản phẩm lên cửa hàng</span></div>
            </a>
            <a routerLink="/seller/categories" class="quick-link-item">
              <div class="ql-icon" style="background:var(--color-success-subtle);color:var(--color-success)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </div>
              <div><p>Quản lý danh mục</p><span>Thêm/sửa danh mục shop</span></div>
            </a>
            <a routerLink="/seller/brands" class="quick-link-item">
              <div class="ql-icon" style="background:var(--color-surface-sunken);color:var(--color-accent)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
              </div>
              <div><p>Quản lý thương hiệu</p><span>Tạo và quản lý brand</span></div>
            </a>
            <a routerLink="/seller/orders" class="quick-link-item">
              <div class="ql-icon" style="background:var(--color-danger-subtle);color:var(--color-danger)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              </div>
              <div><p>Quản lý đơn hàng</p><span>Xem và xử lý đơn hàng</span></div>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .seller-dash { padding: 0; max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--space-6); font-family: var(--font-body); }

    /* Welcome */
    .welcome-banner { background: linear-gradient(135deg, var(--color-surface-dark-2) 0%, var(--color-surface-dark) 100%); border-radius: var(--radius-xl); padding: var(--space-12); display: flex; justify-content: space-between; align-items: center; position: relative; overflow: hidden; box-shadow: var(--shadow-card); }
    .welcome-banner::after { content: ''; position: absolute; top: -50%; right: -10%; width: 400px; height: 400px; background: radial-gradient(circle, oklch(0.68 0.16 250 / 0.1) 0%, transparent 70%); border-radius: 50%; }
    .welcome-text h1 { margin: 0; font-family: var(--font-display); font-size: 2.2rem; font-weight: 900; color: var(--color-text-on-dark); letter-spacing: -0.02em; }
    .welcome-text p { margin: 8px 0 0; color: var(--color-text-on-dark-muted); font-size: 1.05rem; font-weight: 500; }
    .banner-date { background: oklch(1 0 0 / 0.1); backdrop-filter: blur(10px); color: var(--color-text-on-dark); padding: 10px 24px; border-radius: var(--radius-md); font-weight: 800; font-size: 0.9rem; border: 1px solid oklch(1 0 0 / 0.15); text-transform: uppercase; letter-spacing: 0.05em; }

    /* Stat Cards */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); }
    .stat-card { background: var(--color-surface-raised); border-radius: var(--radius-lg); padding: var(--space-6); display: flex; align-items: center; gap: var(--space-4); box-shadow: var(--shadow-card); border: 1px solid var(--color-border); transition: all var(--duration-fast); position: relative; overflow: hidden; }
    .stat-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); border-color: var(--color-border-strong); }
    .stat-icon { width: 56px; height: 56px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-body { flex: 1; }
    .stat-label { margin: 0; font-size: 0.75rem; color: var(--color-text-tertiary); font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    .stat-value { margin: 4px 0 0; font-family: var(--font-display); font-size: 1.6rem; font-weight: 900; color: var(--color-text-primary); line-height: 1.2; letter-spacing: -0.02em; }
    .stat-unit { font-size: 0.75rem; color: var(--color-text-secondary); font-weight: 600; }
    .stat-trend { position: absolute; top: 16px; right: 16px; color: var(--color-success); display: flex; align-items: center; }

    /* Charts */
    .charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-4); }
    .chart-card { background: var(--color-surface-raised); border-radius: var(--radius-lg); padding: var(--space-6); box-shadow: var(--shadow-card); border: 1px solid var(--color-border); }
    .chart-body { height: 260px; position: relative; }
    .chart-body canvas { max-height: 100%; }

    /* Card Header */
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6); }
    .card-header h3 { margin: 0; font-family: var(--font-display); font-size: 1.25rem; font-weight: 900; color: var(--color-text-primary); position: relative; padding-left: 14px; letter-spacing: -0.01em; }
    .card-header h3::before { content: ''; position: absolute; left: 0; top: 15%; height: 70%; width: 5px; background: var(--color-accent); border-radius: 4px; }
    .view-all-btn { font-size: 0.8rem; color: var(--color-accent); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; text-decoration: none; transition: all var(--duration-fast); display: flex; align-items: center; gap: 4px; }
    .view-all-btn:hover { color: var(--color-text-primary); transform: translateX(4px); }

    /* Tables */
    .table-card { background: var(--color-surface-raised); border-radius: var(--radius-xl); padding: var(--space-6); box-shadow: var(--shadow-card); border: 1px solid var(--color-border); }
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table thead th { padding: 14px 16px; text-align: left; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: var(--color-text-tertiary); letter-spacing: 0.1em; border-bottom: 2px solid var(--color-border); background: var(--color-surface-sunken); }
    .data-table tbody td { padding: 16px; font-size: 0.9rem; color: var(--color-text-primary); border-bottom: 1px solid var(--color-border); font-weight: 500; }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover { background: var(--color-surface-sunken); }
    .order-code { font-weight: 800; color: var(--color-accent); font-family: monospace; font-size: 1rem; }
    .status-badge { padding: 6px 12px; border-radius: var(--radius-pill); font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
    .empty-row { text-align: center; color: var(--color-text-tertiary); padding: 40px 0 !important; font-weight: 600; }

    /* Bottom Row */
    .bottom-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }

    /* Product List */
    .product-list { display: flex; flex-direction: column; gap: var(--space-2); }
    .product-item { display: flex; align-items: center; gap: 14px; padding: 12px; border-radius: var(--radius-sm); border-bottom: 1px solid var(--color-surface-sunken); transition: background var(--duration-fast); }
    .product-item:hover { background: var(--color-surface-sunken); }
    .product-item:last-child { border-bottom: none; }
    .rank { width: 28px; height: 28px; border-radius: 50%; background: var(--color-surface-sunken); color: var(--color-text-tertiary); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 900; flex-shrink: 0; }
    .rank.gold { background: var(--color-accent-subtle); color: var(--color-accent); }
    .rank.silver { background: oklch(0.9 0.02 255); color: oklch(0.5 0.02 255); }
    .rank.bronze { background: oklch(0.9 0.02 50); color: oklch(0.5 0.04 50); }
    .product-thumb { width: 44px; height: 44px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; border: 1px solid var(--color-border); }
    .product-avatar { width: 44px; height: 44px; border-radius: var(--radius-sm); background: var(--color-surface-dark); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1rem; flex-shrink: 0; }
    .product-info { flex: 1; min-width: 0; }
    .product-name { display: block; font-weight: 700; font-size: 0.9rem; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .product-meta { font-size: 0.75rem; color: var(--color-text-tertiary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .product-price { font-weight: 800; font-size: 1rem; color: var(--color-danger); white-space: nowrap; font-family: var(--font-display); }

    /* Quick Links */
    .quick-links { display: flex; flex-direction: column; gap: var(--space-3); }
    .quick-link-item { display: flex; align-items: center; gap: 16px; padding: 18px; border-radius: var(--radius-md); background: var(--color-surface-raised); text-decoration: none; transition: all var(--duration-fast); border: 1px solid var(--color-border); }
    .quick-link-item:hover { background: var(--color-surface-sunken); border-color: var(--color-accent); transform: translateX(4px); box-shadow: var(--shadow-card); }
    .ql-icon { width: 50px; height: 50px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .quick-link-item p { margin: 0; font-weight: 800; font-size: 0.9rem; color: var(--color-text-primary); text-transform: uppercase; letter-spacing: 0.05em; }
    .quick-link-item span { font-size: 0.8rem; color: var(--color-text-secondary); font-weight: 600; }

    /* Loading */
    .loading-state { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 40px; color: var(--color-text-tertiary); font-weight: 700; font-size: 0.9rem; }
    .spinner { width: 24px; height: 24px; border: 3px solid var(--color-border); border-top-color: var(--color-text-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 900px) { .charts-row, .bottom-row { grid-template-columns: 1fr; } }
    @media (max-width: 600px) { .stats-grid { grid-template-columns: 1fr; } }
  `]
})
export class SellerDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  private sanitizer = inject(DomSanitizer);

  private charts: any[] = [];
  private salesData: { labels: string[]; values: number[] } = { labels: [], values: [] };
  private statusData: { labels: string[]; values: number[]; colors: string[] } = { labels: [], values: [], colors: [] };
  private chartsReady = false;

  loading = signal(true);
  today = new Date();

  stats = signal({ orders: 0, revenue: 0, products: 0, categories: 0 });
  recentOrders = signal<any[]>([]);
  topProducts = signal<any[]>([]);

  private getSellerId(): number | null {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || user.userId || null;
    } catch { return null; }
  }

  readonly statusConfig: Record<string, { color: string; label: string; bg: string }> = {
    PENDING: { color: '#f59e0b', label: 'Chờ xử lý', bg: '#fef3c7' },
    PAID: { color: '#3b82f6', label: 'Đã thanh toán', bg: '#dbeafe' },
    CONFIRMED: { color: '#6366f1', label: 'Xác nhận', bg: '#e0e7ff' },
    PROCESSING: { color: '#8b5cf6', label: 'Đang xử lý', bg: '#f3e8ff' },
    SHIPPED: { color: '#f97316', label: 'Đang giao', bg: '#ffedd5' },
    DELIVERED: { color: '#10b981', label: 'Đã giao', bg: '#d1fae5' },
    RETURNED: { color: '#64748b', label: 'Trả hàng', bg: '#f1f5f9' },
    CANCELLED: { color: '#ef4444', label: 'Đã hủy', bg: '#fee2e2' },
  };

  readonly statCards: { key: string; title: string; unit: string; color: string; bgColor: string; svgIcon: SafeHtml }[] = [
    {
      key: 'revenue', title: 'Doanh thu', unit: 'VNĐ',
      color: 'var(--color-accent)', bgColor: 'var(--color-accent-subtle)',
      svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`),
    },
    {
      key: 'orders', title: 'Đơn hàng', unit: 'đơn',
      color: 'var(--color-success)', bgColor: 'var(--color-success-subtle)',
      svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`),
    },
    {
      key: 'products', title: 'Sản phẩm', unit: 'sản phẩm',
      color: 'var(--color-accent)', bgColor: 'var(--color-surface-sunken)',
      svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`),
    },
    {
      key: 'categories', title: 'Danh mục', unit: 'loại',
      color: 'var(--color-danger)', bgColor: 'var(--color-danger-subtle)',
      svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="7" height="7"/><rect x="15" y="3" width="7" height="7"/><rect x="15" y="14" width="7" height="7"/><rect x="2" y="14" width="7" height="7"/></svg>`),
    },
  ];

  ngOnInit() { this.loadAll(); }

  ngAfterViewInit() {
    this.chartsReady = true;
  }

  ngOnDestroy() { this.destroyCharts(); }

  loadAll() {
    this.loading.set(true);

    // Seller categories count
    this.categoryService.getSellerCategories().subscribe({
      next: (cats) => {
        this.stats.update(s => ({ ...s, categories: cats.length }));
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    const userId = this.getSellerId();

    // Seller products
    this.productService.getProducts({ sellerId: userId || undefined }).subscribe({
      next: (prods) => {
        const list = Array.isArray(prods) ? prods : [];
        this.stats.update(s => ({ ...s, products: list.length }));
        // top products sorted by soldCount
        const top = [...list].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0, 5);
        this.topProducts.set(top);
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    // Seller orders
    this.orderService.getSellerOrders().subscribe({
      next: (res) => {
        const orders = res || [];
        const revenue = orders
          .filter((o: any) => o.status === 'DELIVERED')
          .reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);

        this.stats.update(s => ({ ...s, orders: orders.length, revenue }));

        // Recent 5 orders
        const recent = [...orders].sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 5).map((o: any) => ({
          ...o,
          orderCode: `#${String(o.id).padStart(6, '0')}`,
          customerName: `${o.user?.firstname || ''} ${o.user?.lastname || ''}`.trim() || 'Khách hàng',
          totalAmount: parseFloat(o.totalAmount || 0),
          date: new Date(o.createdAt).toLocaleDateString('vi-VN'),
        }));
        this.recentOrders.set(recent);

        // Build chart data
        const monthly: Record<string, number> = {};
        orders.filter((o: any) => o.status === 'DELIVERED').forEach((o: any) => {
          const d = new Date(o.createdAt);
          const key = `Th.${d.getMonth() + 1}`;
          monthly[key] = (monthly[key] || 0) + Number(o.totalAmount || 0);
        });
        const last6 = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
          return `Th.${d.getMonth() + 1}`;
        });
        this.salesData = { labels: last6, values: last6.map(m => monthly[m] || 0) };

        const statusCount: Record<string, number> = {};
        orders.forEach((o: any) => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });
        const sLabels = Object.keys(statusCount);
        this.statusData = {
          labels: sLabels.map(k => this.statusConfig[k]?.label || k),
          values: sLabels.map(k => statusCount[k]),
          colors: sLabels.map(k => this.statusConfig[k]?.color || '#6366f1'),
        };

        this.loading.set(false);
        this.cdr.detectChanges();

        if (this.chartsReady) {
          setTimeout(() => this.renderCharts(), 150);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  private async renderCharts() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.destroyCharts();

    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    // Sales chart
    const salesEl = document.getElementById('sellerSalesChart') as HTMLCanvasElement;
    if (salesEl) {
      this.charts.push(new Chart(salesEl, {
        type: 'bar',
        data: {
          labels: this.salesData.labels,
          datasets: [{
            label: 'Doanh thu (VNĐ)',
            data: this.salesData.values,
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderRadius: 8,
            borderSkipped: false,
            hoverBackgroundColor: '#6366f1',
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw as number;
                  return ' ' + new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
                }
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              grid: { color: 'rgba(0,0,0,0.04)' },
              ticks: {
                callback: (val) => {
                  const n = Number(val);
                  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + 'M';
                  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
                  return String(n);
                }
              }
            }
          }
        }
      }));
    }

    // Status donut chart
    const statusEl = document.getElementById('sellerStatusChart') as HTMLCanvasElement;
    if (statusEl && this.statusData.values.length > 0) {
      this.charts.push(new Chart(statusEl, {
        type: 'doughnut',
        data: {
          labels: this.statusData.labels,
          datasets: [{ data: this.statusData.values, backgroundColor: this.statusData.colors, borderWidth: 3, borderColor: '#fff', hoverOffset: 8 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: {
            legend: { position: 'bottom', labels: { padding: 14, font: { size: 11, weight: 'bold' }, boxWidth: 12 } }
          }
        }
      }));
    }
  }

  private destroyCharts() {
    this.charts.forEach(c => { try { c.destroy(); } catch { } });
    this.charts = [];
  }

  getStatValue(key: string): number {
    return (this.stats() as any)[key] ?? 0;
  }

  getStatusCfg(status: string) {
    return this.statusConfig[status] || { color: '#64748b', label: status, bg: '#f1f5f9' };
  }

  getProductImg(p: any): string {
    if (!p?.image) return '';
    if (p.image.startsWith('http')) return p.image;
    return `https://nestjs-zvmg.onrender.com${p.image.startsWith('/') ? p.image : '/' + p.image}`;
  }
}
