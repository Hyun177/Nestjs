import { Component, OnInit, inject, signal, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { UserService } from '../../../core/services/user.service';

import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTabsModule, NzTabsComponent, NzTabComponent } from 'ng-zorro-antd/tabs';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzDividerModule } from 'ng-zorro-antd/divider';

@Component({
  selector: 'app-admin-shops',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzCardModule,
    NzTableModule,
    NzStatisticModule,
    NzIconModule,
    NzGridModule,
    NzTagModule,
    NzEmptyModule,
    NzTabsComponent,
    NzTabComponent,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzUploadModule,
    NzDividerModule
  ],
  template: `
    <div class="admin-shops-page">
      <div class="header-section">
        <div class="header-overlay"></div>
        <div class="header-content">
          <h1>Quản lý Hệ thống Cửa hàng</h1>
          <p>Phân tích dữ liệu doanh thu, hàng tồn và đơn hàng của các đối tác người bán trên nền tảng.</p>
        </div>
      </div>

      <div class="main-controls">
        <div class="search-label">
          <span nz-icon nzType="shop" nzTheme="outline"></span>
          <span>Chọn Cửa hàng Phân tích:</span>
        </div>
        <nz-select 
          [(ngModel)]="selectedSellerId" 
          (ngModelChange)="onSellerChange($event)" 
          nzPlaceHolder="🔍 Tìm tên shop hoặc email..."
          nzShowSearch
          class="custom-select">
          <ng-container *ngFor="let s of sellers()">
            <nz-option [nzValue]="s.id" [nzLabel]="s.name"></nz-option>
          </ng-container>
        </nz-select>
        <button class="seller-btn seller-btn-primary refresh-btn" *ngIf="selectedSellerId" (click)="loadShopData(selectedSellerId)">
          <span nz-icon nzType="loading" *ngIf="loading()"></span>
          <span nz-icon nzType="sync" *ngIf="!loading()"></span> 
          Đồng bộ Dữ liệu
        </button>
      </div>

      <ng-container *ngIf="selectedSellerId && !loading(); else emptyState">
        
        <!-- Statistics Cards -->
        <div nz-row [nzGutter]="[24, 24]" class="stat-cards">
          <div nz-col nzXs="24" nzSm="12" nzLg="8">
            <nz-card class="stat-card revenue-card">
              <div class="stat-icon"><span nz-icon nzType="dollar"></span></div>
              <div class="stat-info">
                <h4>Tổng Doanh Thu (Đã giao)</h4>
                <div class="stat-value">{{ formatCurrency(totalRevenue()) }}</div>
              </div>
            </nz-card>
          </div>
          <div nz-col nzXs="24" nzSm="12" nzLg="8">
            <nz-card class="stat-card order-card">
              <div class="stat-icon"><span nz-icon nzType="shopping-cart"></span></div>
              <div class="stat-info">
                <h4>Tổng Đơn Hàng</h4>
                <div class="stat-value">{{ orders().length }}</div>
              </div>
            </nz-card>
          </div>
          <div nz-col nzXs="24" nzSm="12" nzLg="8">
            <nz-card class="stat-card product-card">
              <div class="stat-icon"><span nz-icon nzType="appstore"></span></div>
              <div class="stat-info">
                <h4>Số Lượng Sản Phẩm</h4>
                <div class="stat-value">{{ products().length }}</div>
              </div>
            </nz-card>
          </div>
        </div>

        <!-- Detailed Info Tabs -->
        <nz-card class="detail-card">
          <nz-tabs>
            
            <nz-tab nzTitle="Danh sách Đơn hàng">
              <nz-table #orderTable [nzData]="orders()" [nzPageSize]="5">
                <thead>
                  <tr>
                    <th>Mã Đơn</th>
                    <th>Khách Hàng</th>
                    <th>Ngày Đặt</th>
                    <th style="text-align: right">Tổng C.Chi</th>
                    <th>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let order of orderTable.data">
                    <td style="font-weight: 600">{{ order.orderCode || '—' }}</td>
                    <td>{{ order.customerName || 'Khách' }}<br><small style="color: #64748b">{{ order.shippingPhone }}</small></td>
                    <td>{{ order.createdAt | date:'short' }}</td>
                    <td style="text-align: right; font-weight: 600; color: #ef4444">{{ formatCurrency(order.totalAmount) }}</td>
                    <td><nz-tag [nzColor]="getStatusColor(order.status)">{{ order.status }}</nz-tag></td>
                  </tr>
                </tbody>
              </nz-table>
            </nz-tab>

            <nz-tab nzTitle="Thông tin & Cài đặt Shop">
              <div class="shop-settings">
                <div nz-row [nzGutter]="32">
                  <div nz-col nzSpan="12">
                     <h3>Thông tin Tài khoản Seller</h3>
                     <nz-form-item>
                        <nz-form-label>Email</nz-form-label>
                        <nz-form-control>
                          <input nz-input [(ngModel)]="sellerDetails.email" disabled />
                        </nz-form-control>
                     </nz-form-item>
                     <div nz-row [nzGutter]="16">
                        <div nz-col nzSpan="12">
                          <nz-form-item>
                            <nz-form-label>Họ (Firstname)</nz-form-label>
                            <nz-form-control>
                              <input nz-input [(ngModel)]="sellerDetails.firstname" />
                            </nz-form-control>
                          </nz-form-item>
                        </div>
                        <div nz-col nzSpan="12">
                          <nz-form-item>
                            <nz-form-label>Tên (Lastname)</nz-form-label>
                            <nz-form-control>
                              <input nz-input [(ngModel)]="sellerDetails.lastname" />
                            </nz-form-control>
                          </nz-form-item>
                        </div>
                     </div>
                     <button nz-button nzType="primary" [nzLoading]="updating()" (click)="updateUser()">Lưu Thông tin User</button>
                  </div>

                  <div nz-col nzSpan="12">
                    <nz-divider nzType="vertical" style="height: 100%; position: absolute; left: 0;" class="desktop-only"></nz-divider>
                    <h3>Thông tin Shop (Giao diện)</h3>
                    
                    <div class="asset-upload-row">
                      <div class="asset-box">
                        <img [src]="getFullUrl(shopInfo.logo, 'assets/default-shop.png')" class="asset-preview logo-preview" />
                        <nz-upload [nzCustomRequest]="handleUploadLogo" [nzShowUploadList]="false">
                          <button nz-button nzSize="small">
                            <span nz-icon nzType="upload"></span> Logo
                          </button>
                        </nz-upload>
                      </div>
                      <div class="asset-box">
                        <img [src]="getFullUrl(shopInfo.coverImage, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=60')" class="asset-preview" />
                        <nz-upload [nzCustomRequest]="handleUploadCover" [nzShowUploadList]="false">
                          <button nz-button nzSize="small">
                            <span nz-icon nzType="upload"></span> Bìa
                          </button>
                        </nz-upload>
                      </div>
                    </div>

                    <nz-form-item>
                      <nz-form-label>Tên Shop</nz-form-label>
                      <nz-form-control>
                        <input nz-input [(ngModel)]="shopInfo.name" placeholder="Tên hiển thị shop" />
                      </nz-form-control>
                    </nz-form-item>
                    <nz-form-item>
                      <nz-form-label>Mô tả Shop</nz-form-label>
                      <nz-form-control>
                        <textarea nz-input [(ngModel)]="shopInfo.description" rows="4" placeholder="Mô tả về shop..."></textarea>
                      </nz-form-control>
                    </nz-form-item>
                    <div nz-row [nzGutter]="16">
                       <div nz-col nzSpan="12">
                          <nz-form-item>
                            <nz-form-label>Đánh giá</nz-form-label>
                            <nz-form-control>
                              <input nz-input type="number" [(ngModel)]="shopInfo.rating" step="0.1" max="5" />
                            </nz-form-control>
                          </nz-form-item>
                       </div>
                       <div nz-col nzSpan="12">
                          <nz-form-item>
                            <nz-form-label>Người theo dõi</nz-form-label>
                            <nz-form-control>
                              <input nz-input type="number" [(ngModel)]="shopInfo.followerCount" />
                            </nz-form-control>
                          </nz-form-item>
                       </div>
                    </div>
                    <button nz-button nzType="primary" nzSuccess [nzLoading]="updating()" (click)="updateShop()">Cập nhật Shop (Vua Admin)</button>
                  </div>
                </div>
              </div>
            </nz-tab>

          </nz-tabs>
        </nz-card>
      </ng-container>

      <ng-template #emptyState>
        <div class="empty-state-wrapper" *ngIf="!loading()">
           <div class="empty-icon-box">📦</div>
           <h3 style="color:#1e293b; margin-bottom: 8px; font-weight: 800;">Chế độ Xem Shop</h3>
           <p style="color:#64748b; max-width: 400px; line-height: 1.6;">Vui lòng chọn một người bán từ danh sách phía trên để truy cập báo cáo chi tiết về tình hình kinh doanh.</p>
        </div>
        <div class="empty-state-wrapper" *ngIf="loading()">
           <div class="loader-ring"></div>
           <p style="margin-top: 16px; color:#475569; font-weight: 600;">Hệ thống đang truy xuất dữ liệu shop...</p>
        </div>
      </ng-template>

    </div>
  `,
  styles: [`
    .admin-shops-page { padding: 32px; max-width: 1400px; margin: 0 auto; min-height: 90vh; background: #f8fafc; }
    
    .header-section { position: relative; background: linear-gradient(135deg, #0f172a 0%, #334155 100%); border-radius: 24px; padding: 48px; color: white; margin-bottom: 32px; overflow: hidden; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15); }
    .header-overlay { position: absolute; top: -50%; right: -10%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%); border-radius: 50%; }
    .header-content { position: relative; z-index: 2; }
    .header-content h1 { color: white; margin: 0 0 12px; font-weight: 900; font-size: 2.2rem; letter-spacing: -0.5px; font-family: 'Archivo Black', sans-serif; }
    .header-content p { color: #94a3b8; margin: 0; font-size: 1.1rem; max-width: 600px; line-height: 1.6; }

    .main-controls { display: flex; align-items: center; gap: 20px; margin-bottom: 40px; background: white; padding: 24px 32px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; }
    .search-label { display: flex; align-items: center; gap: 10px; font-weight: 700; color: #0f172a; font-size: 1rem; }
    .search-label [nz-icon] { color: #f59e0b; font-size: 1.2rem; }
    .custom-select { width: 350px !important; }
    ::ng-deep .custom-select .ant-select-selector { border-radius: 12px !important; height: 48px !important; display: flex !important; align-items: center !important; border-color: #e2e8f0 !important; background: #f8fafc !important; }
    ::ng-deep .custom-select .ant-select-selector:hover { border-color: #f59e0b !important; }
    .refresh-btn { height: 48px; padding: 0 24px; font-weight: 800; border-radius: 14px; }

    .stat-cards { margin-bottom: 32px; }
    .stat-card { border-radius: 20px; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.04); transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); background: #fff; }
    .stat-card:hover { transform: translateY(-8px); }
    ::ng-deep .stat-card .ant-card-body { display: flex; align-items: center; gap: 24px; padding: 32px; }
    .stat-icon { width: 64px; height: 64px; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 32px; flex-shrink: 0; box-shadow: inset 0 2px 4px rgba(255,255,255,0.8); }
    .revenue-card .stat-icon { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; }
    .order-card .stat-icon { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #fff; }
    .product-card .stat-icon { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; }
    .stat-info h4 { margin: 0 0 6px; font-size: 0.85rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 1.8rem; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }

    .detail-card { border-radius: 24px; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.04); overflow: hidden; }
    ::ng-deep .ant-tabs-nav { background: #f8fafc; padding: 0 20px; margin-bottom: 0 !important; }
    ::ng-deep .ant-tabs-tab { padding: 20px 24px !important; font-weight: 700 !important; font-size: 1rem !important; color: #64748b !important; }
    ::ng-deep .ant-tabs-tab-active .ant-tabs-tab-btn { color: #0f172a !important; }
    ::ng-deep .ant-tabs-ink-bar { background: #0f172a !important; height: 3px !important; border-radius: 3px 3px 0 0; }

    .empty-state-wrapper { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120px 40px; background: white; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); text-align: center; }
    .empty-icon-box { font-size: 64px; margin-bottom: 24px; animation: float 3s ease-in-out infinite; }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    
    .loader-ring { width: 48px; height: 48px; border: 4px solid #f1f5f9; border-top-color: #f59e0b; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .shop-settings { padding: 24px; }
    .shop-settings h3 { font-weight: 800; color: #0f172a; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
    .shop-settings h3::before { content: ''; width: 4px; height: 20px; background: #f59e0b; border-radius: 2px; }
    ::ng-deep .ant-form-label > label { font-weight: 700; color: #64748b; }
    ::ng-deep .ant-input, ::ng-deep .ant-input-number { border-radius: 8px; padding: 10px 16px; border-color: #e2e8f0; }
    .desktop-only { @media (max-width: 992px) { display: none; } }

    .asset-upload-row { display: flex; gap: 20px; margin-bottom: 24px; }
    .asset-box { flex: 1; text-align: center; border: 2px dashed #e2e8f0; padding: 16px; border-radius: 12px; transition: 0.3s; }
    .asset-box:hover { border-color: #f59e0b; background: #fffcf0; }
    .asset-preview { width: 100%; height: 80px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; background: #f1f5f9; }
    .logo-preview { width: 80px; height: 80px; border-radius: 20px; }
  `]
})
export class AdminShopsComponent implements OnInit {
  private userService = inject(UserService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private message = inject(NzMessageService);

  sellers = signal<any[]>([]);
  selectedSellerId: number | null = null;
  loading = signal(false);
  updating = signal(false);

  orders = signal<any[]>([]);
  products = signal<any[]>([]);
  shopInfo: any = {};
  sellerDetails: any = {};
  totalRevenue = signal(0);

  ngOnInit() {
    this.loadSellers();
  }

  loadSellers() {
    this.userService.getAllUsers().subscribe({
      next: (data: any) => {
        const _sellers = (data || []).map((u: any) => ({
          ...u,
          name: u.firstname ? `${u.firstname} ${u.lastname}`.trim() : u.email
        })).filter((u: any) => u.roles?.some((r: any) => r.name === 'seller'));
        this.sellers.set(_sellers);
      }
    });
  }

  onSellerChange(sellerId: number) {
    if (!sellerId) return;
    this.loadShopData(sellerId);
  }

  loadShopData(sellerId: number) {
    this.loading.set(true);
    let resolved = 0;

    const checkComplete = () => {
      resolved++;
      if (resolved === 3) {
        this.loading.set(false);
        this.cdr.detectChanges();
      }
    };

    // Load Orders (Fixed Endpoint)
    this.http.get(`http://localhost:3000/api/order/seller/${sellerId}`, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        const orderList = Array.isArray(res) ? res : (res?.data || []);
        this.orders.set(orderList);

        let revenue = 0;
        orderList.forEach((o: any) => {
          if (o.status === 'DELIVERED') {
            revenue += Number(o.totalAmount || 0);
          }
        });
        this.totalRevenue.set(revenue);
        checkComplete();
      },
      error: () => { this.orders.set([]); this.totalRevenue.set(0); checkComplete(); }
    });

    // Load Products
    this.http.get(`http://localhost:3000/api/product?userId=${sellerId}&showAll=true&limit=1000`, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        const prodList = Array.isArray(res) ? res : (res?.data || []);
        this.products.set(prodList);
        checkComplete();
      },
      error: () => { this.products.set([]); checkComplete(); }
    });

    // Load Shop Info & Seller Details
    this.http.get(`http://localhost:3000/api/shop/seller/${sellerId}`, { headers: this.getHeaders() }).subscribe({
      next: (shop: any) => {
        this.shopInfo = shop || {};
        this.sellerDetails = this.sellers().find(s => s.id === sellerId) || {};
        checkComplete();
      },
      error: () => { this.shopInfo = {}; checkComplete(); }
    });
  }

  updateShop() {
    if (!this.shopInfo.id) return;
    this.updating.set(true);
    this.http.patch(`http://localhost:3000/api/shop/${this.shopInfo.id}`, this.shopInfo, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.message.success('Cập nhật thông tin shop thành công (Quyền Admin)');
        this.updating.set(false);
      },
      error: () => {
        this.message.error('Lỗi khi cập nhật shop');
        this.updating.set(false);
      }
    });
  }

  updateUser() {
    if (!this.selectedSellerId) return;
    this.updating.set(true);
    // Assuming UserService has update method or using direct http
    this.http.put(`http://localhost:3000/api/users/${this.selectedSellerId}`, {
      firstname: this.sellerDetails.firstname,
      lastname: this.sellerDetails.lastname
    }, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.message.success('Cập nhật thông tin User thành công');
        this.loadSellers(); // Refresh list
        this.updating.set(false);
      },
      error: () => {
        this.message.error('Lỗi khi cập nhật thông tin User');
        this.updating.set(false);
      }
    });
  }

  private getHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') || '' : '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  }

  getImg(p: any): string {
    if (!p?.image) return '';
    if (p.image.startsWith('http')) return p.image;
    return `http://localhost:3000${p.image.startsWith('/') ? p.image : '/' + p.image}`;
  }

  getStatusColor(status: string) {
    switch (status) {
      case 'PENDING': return 'orange';
      case 'CONFIRMED': return 'cyan';
      case 'SHIPPING': return 'blue';
      case 'DELIVERED': return 'success';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  }

  getFullUrl(path: string, fallback: string = ''): string {
    if (!path) return fallback;
    if (path.startsWith('http')) return path;
    return `http://localhost:3000${path.startsWith('/') ? '' : '/'}${path}`;
  }

  handleUploadLogo = (item: any) => {
    if (!this.shopInfo.id) return new Subscription();
    const formData = new FormData();
    formData.append('logo', item.file);
    return this.http.post(`http://localhost:3000/api/shop/${this.shopInfo.id}/logo`, formData, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        this.shopInfo.logo = res.logo;
        this.message.success('Tải logo lên thành công');
        this.cdr.detectChanges();
      }
    });
  }

  handleUploadCover = (item: any) => {
    if (!this.shopInfo.id) return new Subscription();
    const formData = new FormData();
    formData.append('cover', item.file);
    return this.http.post(`http://localhost:3000/api/shop/${this.shopInfo.id}/cover`, formData, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        this.shopInfo.coverImage = res.coverImage;
        this.message.success('Tải ảnh bìa lên thành công');
        this.cdr.detectChanges();
      }
    });
  }
}

