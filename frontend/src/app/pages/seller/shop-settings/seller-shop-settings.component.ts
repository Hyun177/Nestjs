import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-seller-shop-settings',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    NzFormModule, 
    NzInputModule, 
    NzButtonModule, 
    NzUploadModule, 
    NzCardModule,
    NzIconModule,
    NzGridModule
  ],
  template: `
    <div class="shop-settings-page">
      <div class="settings-header">
        <h1>Cài đặt Cửa hàng</h1>
        <p>Quản lý nhận diện thương hiệu và thông tin giới thiệu của bạn trên marketplace.</p>
      </div>

      <nz-card [nzBordered]="false" class="main-card">
        <div nz-row [nzGutter]="48">
          <!-- Left Col: Preview and Visuals -->
          <div nz-col [nzXs]="24" [nzLg]="10">
            <h3 class="section-title">Nhận diện thương hiệu</h3>
            
            <!-- Cover Preview -->
            <div class="cover-wrapper">
              <img [src]="getFullUrl(shop.coverImage, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80')" class="cover-preview" />
              <div class="cover-overlay">
                <nz-upload [nzCustomRequest]="handleUploadCover" [nzShowUploadList]="false">
                  <button nz-button nzType="default" class="upload-trigger">
                    <span nz-icon nzType="camera"></span> Thay ảnh bìa
                  </button>
                </nz-upload>
              </div>
              
              <!-- Logo Preview (Overlapping) -->
              <div class="logo-wrapper">
                <img [src]="getFullUrl(shop.logo, 'assets/default-shop.png')" class="logo-img" />
                <nz-upload [nzCustomRequest]="handleUploadLogo" [nzShowUploadList]="false" class="logo-upload">
                   <button nz-button nzType="primary" nzShape="circle" class="logo-btn">
                     <span nz-icon nzType="edit"></span>
                   </button>
                </nz-upload>
              </div>
            </div>
            
            <div class="visual-tips">
              <p><strong>Mẹo nhỏ:</strong></p>
              <ul>
                <li>Ảnh bìa đẹp giúp gian hàng chuyên nghiệp hơn.</li>
                <li>Logo nên là hình vuông (tỷ lệ 1:1) để hiển thị tốt nhất.</li>
              </ul>
            </div>
          </div>

          <!-- Right Col: Form -->
          <div nz-col [nzXs]="24" [nzLg]="14">
            <h3 class="section-title">Thông tin cơ bản</h3>
            
            <form nz-form nzLayout="vertical">
              <nz-form-item>
                <nz-form-label nzRequired>Tên cửa hàng</nz-form-label>
                <nz-form-control nzErrorTip="Vui lòng nhập tên shop">
                  <input nz-input [(ngModel)]="shop.name" name="shopName" placeholder="Ví dụ: Apple Store Official" />
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label>Mô tả shop</nz-form-label>
                <nz-form-control>
                  <textarea nz-input [(ngModel)]="shop.description" name="shopDesc" rows="6" placeholder="Giới thiệu về các sản phẩm và dịch vụ của bạn..."></textarea>
                </nz-form-control>
              </nz-form-item>

              <div class="form-actions">
                <button nz-button nzType="primary" nzSize="large" [nzLoading]="loading" (click)="saveSettings()">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      </nz-card>
    </div>
  `,
  styles: [`
    .shop-settings-page { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .settings-header { margin-bottom: 32px; }
    .settings-header h1 { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
    .settings-header p { color: #64748b; font-size: 1.1rem; }

    .main-card { border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
    .section-title { font-weight: 800; margin-bottom: 24px; color: #1e293b; display: flex; align-items: center; gap: 10px; }
    .section-title::before { content: ''; width: 4px; height: 18px; background: #6366f1; border-radius: 4px; }

    /* Visual Previews */
    .cover-wrapper { position: relative; width: 100%; height: 260px; border-radius: 16px; overflow: visible; margin-bottom: 80px; }
    .cover-preview { width: 100%; height: 100%; object-fit: cover; border-radius: 16px; background: #f1f5f9; }
    .cover-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.2); opacity: 0; transition: 0.3s; display: flex; align-items: center; justify-content: center; border-radius: 16px; }
    .cover-wrapper:hover .cover-overlay { opacity: 1; }
    
    .logo-wrapper { position: absolute; bottom: -60px; left: 30px; width: 120px; height: 120px; border-radius: 24px; border: 4px solid white; background: white; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
    .logo-img { width: 100%; height: 100%; object-fit: cover; border-radius: 20px; }
    .logo-upload { position: absolute; bottom: -5px; right: -5px; }
    .logo-btn { border: 2px solid white !important; }

    .visual-tips { background: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #6366f1; }
    .visual-tips p { margin-bottom: 8px; font-weight: 700; }
    .visual-tips ul { padding-left: 20px; margin: 0; color: #64748b; }

    .form-actions { margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; }
    .form-actions button { min-width: 180px; border-radius: 12px; font-weight: 700; height: 50px; }

    ::ng-deep .ant-form-label label { font-weight: 700; color: #475569; }
    ::ng-deep .ant-input { border-radius: 10px; padding: 12px 16px; }
  `]
})
export class SellerShopSettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  shop: any = {};
  loading = false;

  ngOnInit() {
    this.loadShopInfo();
  }

  loadShopInfo() {
    this.http.get('https://nestjs-zvmg.onrender.com/api/shop/me', { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        this.shop = res || {};
        this.cdr.detectChanges();
      },
      error: () => this.message.error('Không thể tải thông tin shop')
    });
  }

  saveSettings() {
    if (!this.shop.name) {
      this.message.warning('Tên shop không được để trống');
      return;
    }

    this.loading = true;
    this.http.patch('https://nestjs-zvmg.onrender.com/api/shop/me', this.shop, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.message.success('Đã cập nhật thông tin cửa hàng');
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.message.error('Lỗi khi cập nhật thông tin');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  handleUploadLogo = (item: any) => {
    if (!this.shop.id) return new Subscription();
    const formData = new FormData();
    formData.append('logo', item.file);
    return this.http.post(`https://nestjs-zvmg.onrender.com/api/shop/${this.shop.id}/logo`, formData, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        this.shop.logo = res.logo;
        this.message.success('Cập nhật logo thành công');
        this.cdr.detectChanges();
      },
      error: () => this.message.error('Lỗi khi tải logo lên')
    });
  }

  handleUploadCover = (item: any) => {
    if (!this.shop.id) return new Subscription();
    const formData = new FormData();
    formData.append('cover', item.file);
    return this.http.post(`https://nestjs-zvmg.onrender.com/api/shop/${this.shop.id}/cover`, formData, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        this.shop.coverImage = res.coverImage;
        this.message.success('Cập nhật ảnh bìa thành công');
        this.cdr.detectChanges();
      },
      error: () => this.message.error('Lỗi khi tải ảnh bìa lên')
    });
  }

  getFullUrl(path: string, fallback: string = ''): string {
    if (!path) return fallback;
    if (path.startsWith('http')) return path;
    return `https://nestjs-zvmg.onrender.com${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private getHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') || '' : '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
}
