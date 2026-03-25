import { Component, inject, signal, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { DashboardService } from '../../../core/services/dashboard.service';
import { VndCurrencyPipe } from '../../../shared/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzTableModule,
    NzButtonModule,
    NzTagModule,
    NzSpinModule,
    VndCurrencyPipe,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  private sanitizer = inject(DomSanitizer);

  private charts: any[] = [];

  loading = signal(true);
  today = new Date();

  stats = signal({
    userCount: 0,
    orderCount: 0,
    productCount: 0,
    totalRevenue: 0,
    trends: { users: 0, orders: 0, products: 0, revenue: 0 },
  });

  recentOrders = signal<any[]>([]);
  topProducts = signal<any[]>([]);

  // Chart data — loaded then used in AfterViewInit/re-render
  private salesData: { labels: string[]; values: number[] } = { labels: [], values: [] };
  private statusData: { labels: string[]; values: number[]; colors: string[] } = {
    labels: [], values: [], colors: [],
  };
  private chartsReady = false;
  private dataLoaded = false;

  readonly statCards: { key: string; title: string; unit: string; color: string; bgColor: string; svgIcon: SafeHtml }[] = [
    {
      key: 'userCount',
      title: 'Người dùng',
      unit: 'người',
      color: '#6366f1',
      bgColor: '#ede9fe',
      svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`),
    },
    {
      key: 'orderCount',
      title: 'Đơn hàng',
      unit: 'đơn',
      color: '#10b981',
      bgColor: '#d1fae5',
      svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`),
    },
    {
      key: 'productCount',
      title: 'Sản phẩm',
      unit: 'sản phẩm',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`),
    },
    {
      key: 'totalRevenue',
      title: 'Doanh thu',
      unit: 'VND',
      color: '#ef4444',
      bgColor: '#fee2e2',
      svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`),
    },
  ];

  readonly orderStatusCfg: Record<string, { color: string; label: string }> = {
    PENDING:   { color: '#f59e0b', label: 'Chờ xử lý' },
    PAID:      { color: '#3b82f6', label: 'Đã thanh toán' },
    SHIPPED:   { color: '#8b5cf6', label: 'Đang giao' },
    DELIVERED: { color: '#10b981', label: 'Đã giao' },
    CANCELLED: { color: '#ef4444', label: 'Đã hủy' },
  };

  ngOnInit() { this.loadAll(); }

  ngAfterViewInit() {
    this.chartsReady = true;
    if (this.dataLoaded) this.renderCharts();
  }

  ngOnDestroy() { this.destroyCharts(); }

  loadAll() {
    this.loading.set(true);

    // Stats
    this.dashboardService.getStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });

    // Recent orders
    this.dashboardService.getRecentOrders().subscribe({
      next: (orders) => {
        this.recentOrders.set(orders.map((o: any) => ({
          id: o.id,
          orderCode: `#${String(o.id).padStart(6, '0')}`,
          customer: `${o.user?.firstname || ''} ${o.user?.lastname || ''}`.trim() || o.user?.email || 'Khách',
          total: Number(o.totalAmount || 0),
          status: o.status,
          date: new Date(o.createdAt).toLocaleDateString('vi-VN'),
        })));
        this.cdr.detectChanges();
      },
    });

    // Top products
    this.dashboardService.getTopProducts().subscribe({
      next: (prods) => {
        this.topProducts.set(prods);
        this.cdr.detectChanges();
      },
    });

    // Order chart data (status distribution)
    this.dashboardService.getAllOrdersAdmin?.()?.subscribe({
      next: (orders: any[]) => {
        const statusCount: Record<string, number> = {};
        (orders || []).forEach((o: any) => {
          statusCount[o.status] = (statusCount[o.status] || 0) + 1;
        });
        const labels = Object.keys(statusCount);
        this.statusData = {
          labels: labels.map(k => this.orderStatusCfg[k]?.label || k),
          values: labels.map(k => statusCount[k]),
          colors: labels.map(k => this.orderStatusCfg[k]?.color || '#6366f1'),
        };

        // Monthly revenue from orders
        const monthly: Record<string, number> = {};
        (orders || [])
          .filter((o: any) => o.status !== 'CANCELLED')
          .forEach((o: any) => {
            const d = new Date(o.createdAt);
            const key = `Th.${d.getMonth() + 1}`;
            monthly[key] = (monthly[key] || 0) + Number(o.totalAmount || 0);
          });

        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - (5 - i));
          return `Th.${d.getMonth() + 1}`;
        });
        this.salesData = {
          labels: last6Months,
          values: last6Months.map(m => monthly[m] || 0),
        };

        this.dataLoaded = true;
        if (this.chartsReady) this.renderCharts();
        this.cdr.detectChanges();
      },
    });
  }

  private async renderCharts() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.destroyCharts();

    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    // Sales Bar Chart
    const salesCanvas = document.getElementById('salesChart') as HTMLCanvasElement;
    if (salesCanvas) {
      const chart1 = new Chart(salesCanvas, {
        type: 'bar',
        data: {
          labels: this.salesData.labels,
          datasets: [{
            label: 'Doanh thu (VNĐ)',
            data: this.salesData.values,
            backgroundColor: 'rgba(99,102,241,0.8)',
            borderRadius: 8,
            borderSkipped: false,
            hoverBackgroundColor: '#6366f1',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw as number;
                  return ' ' + new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
                },
              },
            },
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              grid: { color: 'rgba(0,0,0,0.04)' },
              ticks: {
                callback: (val) => {
                  const num = Number(val);
                  if (num >= 1_000_000) return (num / 1_000_000).toFixed(0) + 'M';
                  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
                  return String(num);
                },
              },
            },
          },
        },
      });
      this.charts.push(chart1);
    }

    // Status Doughnut Chart
    const statusCanvas = document.getElementById('statusChart') as HTMLCanvasElement;
    if (statusCanvas && this.statusData.values.length > 0) {
      const chart2 = new Chart(statusCanvas, {
        type: 'doughnut',
        data: {
          labels: this.statusData.labels,
          datasets: [{
            data: this.statusData.values,
            backgroundColor: this.statusData.colors,
            borderWidth: 3,
            borderColor: '#fff',
            hoverOffset: 8,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { padding: 16, font: { size: 11, weight: 'bold' }, boxWidth: 12, borderRadius: 6 },
            },
          },
        },
      });
      this.charts.push(chart2);
    }
  }

  private destroyCharts() {
    this.charts.forEach(c => { try { c.destroy(); } catch {} });
    this.charts = [];
  }

  getStatValue(key: string): number {
    return (this.stats() as any)[key] ?? 0;
  }

  getTrendValue(key: string): number {
    return (this.stats().trends as any)[key] ?? 0;
  }

  getStatusCfg(status: string) {
    return this.orderStatusCfg[status] || { color: '#94a3b8', label: status };
  }
}
