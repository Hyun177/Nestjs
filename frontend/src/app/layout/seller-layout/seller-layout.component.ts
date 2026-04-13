import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-seller-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    NzLayoutModule,
    NzMenuModule,
    NzButtonModule,
    NzIconModule,
    NzDropDownModule,
    NzAvatarModule,
    NzTooltipModule,
  ],
  template: `
    <nz-layout class="seller-layout">
      <!-- Sidebar -->
      <nz-sider
        [nzWidth]="260"
        [nzCollapsedWidth]="80"
        [(nzCollapsed)]="isCollapsed"
        nzCollapsible
        [nzTrigger]="null"
        class="seller-sidebar"
      >
        <div class="sidebar-header">
          <div class="logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="url(#shop-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <defs>
                <linearGradient id="shop-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#f59e0b" />
                  <stop offset="100%" stop-color="#ef4444" />
                </linearGradient>
              </defs>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span class="logo-text" *ngIf="!isCollapsed">Kênh Người Bán</span>
          </div>
        </div>
        
        <ul nz-menu nzTheme="dark" nzMode="inline" class="custom-menu">
          <li *ngFor="let item of menuItems" nz-menu-item [nzSelected]="isActive(item.path)" [routerLink]="item.path" nz-tooltip [nzTooltipTitle]="isCollapsed ? item.label : ''" nzTooltipPlacement="right">
            <span class="menu-icon" [innerHTML]="item.svgIcon"></span>
            <span *ngIf="!isCollapsed">{{ item.label }}</span>
          </li>
        </ul>
      </nz-sider>

      <!-- Main Layout -->
      <nz-layout class="main-content-layout">
        <!-- Header Section -->
        <nz-header class="seller-header">
          <div class="header-left">
            <button nz-button nzType="text" class="trigger-btn" (click)="isCollapsed = !isCollapsed">
              <span nz-icon [nzType]="isCollapsed ? 'menu-unfold' : 'menu-fold'"></span>
            </button>
            <div class="breadcrumb-nav">
              <span class="root">KÊNH NGƯỜI BÁN</span>
              <span class="sep">/</span>
              <span class="current">{{ currentRouteTitle }}</span>
            </div>
          </div>

          <div class="header-right">
            <button nz-button nzType="text" class="header-icon-btn">
              <span nz-icon nzType="bell"></span>
              <span class="badge-dot"></span>
            </button>
            <div class="user-dropdown" nz-dropdown [nzDropdownMenu]="userMenu" nzPlacement="bottomRight" nzTrigger="click">
              <div class="avatar-wrapper">
                <img [src]="userAvatar" [alt]="userData?.fullName" (error)="onAvatarError()" />
              </div>
              <div class="user-info-text">
                <span class="user-name">{{ userData?.fullName || 'Người bán' }}</span>
                <span class="user-role">Cửa hàng của bạn</span>
              </div>
              <span nz-icon nzType="down" class="dropdown-icon"></span>
            </div>
          </div>
        </nz-header>

        <!-- Dynamic Content Section -->
        <nz-content class="seller-content">
          <div class="content-wrapper">
             <router-outlet></router-outlet>
          </div>
        </nz-content>
      </nz-layout>
    </nz-layout>

    <nz-dropdown-menu #userMenu="nzDropdownMenu">
      <div class="custom-dropdown-menu">
        <div class="dropdown-header">
          <span class="d-label">Tài khoản</span>
          <span class="d-name">{{ userData?.fullName }}</span>
        </div>
        <ul nz-menu>
          <li nz-menu-item routerLink="/profile">
            <span nz-icon nzType="user"></span> Hồ sơ cá nhân
          </li>
          <li nz-menu-item (click)="logout()" class="logout-item">
            <span nz-icon nzType="logout"></span> Đăng xuất
          </li>
        </ul>
      </div>
    </nz-dropdown-menu>
  `,
  styles: [`
    .seller-layout { min-height: 100vh; background: #f0f2f5; font-family: 'Inter', sans-serif; }
    .seller-sidebar { background: #1a1c23; box-shadow: 4px 0 24px rgba(0,0,0,0.15); z-index: 100; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border-right: none; }
    .sidebar-header { height: 80px; display: flex; align-items: center; padding: 0 28px; border-bottom: 1px solid rgba(255,255,255,0.05); overflow: hidden; margin-bottom: 20px; }
    .logo { display: flex; align-items: center; gap: 14px; cursor: pointer; }
    .logo svg { width: 34px; height: 34px; flex-shrink: 0; filter: drop-shadow(0 0 8px rgba(129,140,248,0.5)); stroke: #818cf8; stroke-width: 2.5; }
    .logo-text { color: #ffffff; font-size: 1.35rem; font-weight: 800; letter-spacing: -0.5px; white-space: nowrap; font-family: 'Inter', sans-serif; }
    
    .custom-menu { background: transparent; border-right: none; padding: 0 16px; }
    ::ng-deep .custom-menu .ant-menu-item { border-radius: 12px; margin-bottom: 8px; height: 52px; display: flex !important; align-items: center !important; gap: 14px; color: #94a3b8 !important; transition: all 0.3s ease; padding-left: 20px !important; font-weight: 600; font-size: 0.95rem; }
    ::ng-deep .custom-menu .ant-menu-item:hover { background: rgba(255,255,255,0.05); color: #ffffff !important; transform: translateX(4px); }
    ::ng-deep .custom-menu .ant-menu-item-selected { background: linear-gradient(135deg, #6366f1, #8b5cf6) !important; color: #ffffff !important; font-weight: 700; box-shadow: 0 8px 16px rgba(99, 102, 241, 0.4); }
    ::ng-deep .custom-menu .ant-menu-item .ant-menu-title-content { display: flex !important; align-items: center !important; height: 100% !important; margin: 0 !important; }
    .menu-icon { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; opacity: 0.8; margin-top: 0px; }
    ::ng-deep .ant-menu-item-selected .menu-icon { opacity: 1; filter: drop-shadow(0 0 4px rgba(255,255,255,0.5)); }
    
    .seller-header { background: rgba(255,255,255,0.85); backdrop-filter: blur(14px); height: 80px; padding: 0 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eef2f6; z-index: 50; position: sticky; top: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
    .header-left { display: flex; align-items: center; gap: 24px; }
    .trigger-btn { font-size: 20px; color: #475569; width: 44px; height: 44px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; background: #fff; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.03); }
    .trigger-btn:hover { background: #6366f1; color: #fff; border-color: #6366f1; transform: scale(1.05); }
    
    .breadcrumb-nav { display: flex; align-items: center; gap: 12px; font-size: 0.9rem; }
    .breadcrumb-nav .root { color: #64748b; font-weight: 500; }
    .breadcrumb-nav .sep { color: #cbd5e1; }
    .breadcrumb-nav .current { color: #0f172a; font-weight: 800; font-size: 1.05rem; }
    
    .header-right { display: flex; align-items: center; gap: 24px; }
    .header-icon-btn { width: 44px; height: 44px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; color: #64748b; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: all 0.2s; font-size: 1.2rem; position: relative; }
    .header-icon-btn:hover { border-color: #6366f1; color: #6366f1; background: #f5f3ff; }
    .badge-dot { position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; border: 2px solid #fff; }
    
    .user-dropdown { display: flex; align-items: center; gap: 14px; padding: 6px 16px 6px 6px; border-radius: 14px; cursor: pointer; transition: all 0.2s; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .user-dropdown:hover { border-color: #6366f1; background: #f8fafc; }
    .avatar-wrapper { width: 42px; height: 42px; border-radius: 10px; overflow: hidden; border: 2px solid #fff; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15); background: #eee; }
    .avatar-wrapper img { width: 100%; height: 100%; object-fit: cover; }
    .user-info-text { display: flex; flex-direction: column; line-height: 1.1; }
    .user-name { font-weight: 700; color: #1e293b; font-size: 0.95rem; }
    .user-role { font-size: 0.75rem; color: #6366f1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .dropdown-icon { font-size: 10px; color: #94a3b8; }
    
    .seller-content { padding: 40px; overflow: auto; background: #f0f2f5; min-height: calc(100vh - 80px); }
    .content-wrapper { max-width: 1400px; margin: 0 auto; width: 100%; }

    .custom-dropdown-menu { min-width: 220px; padding: 0; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.12); border: 1px solid #f1f5f9; margin-top: 10px; overflow: hidden; }
    .dropdown-header { padding: 16px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; }
    .d-label { font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
    .d-name { font-size: 0.9rem; color: #1e293b; font-weight: 800; }
    ::ng-deep .custom-dropdown-menu .ant-menu-item { border-radius: 0; font-weight: 600; color: #334155; padding: 14px 20px; display: flex; align-items: center; gap: 12px; margin: 0; border-bottom: 1px solid #f8fafc; }
    ::ng-deep .custom-dropdown-menu .ant-menu-item:hover { background: #f5f3ff; color: #6366f1; }
    .logout-item { color: #ef4444 !important; border-top: none; }
    .logout-item:hover { background: #fef2f2 !important; color: #dc2626 !important; }
  `]
})
export class SellerLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  isCollapsed = false;
  currentRouteTitle = 'TỔNG QUAN';
  userData: any = null;
  userAvatar = '';

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userData = user;
        this.processAvatar(user);
      }
    });

    this.router.events.pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateCurrentRoute();
      });
    this.updateCurrentRoute();
  }

  processAvatar(user: any) {
    const displayName = user.fullName || 
                       (user.firstname ? `${user.firstname} ${user.lastname}`.trim() : null) || 
                       user.name || 
                       user.username || 
                       'User';
    
    let avatarUrl = user.profilePicture || user.avatar || user.profileUrl || '';
    
    if (avatarUrl && !avatarUrl.startsWith('http')) {
        const cleanPath = avatarUrl.startsWith('/') ? avatarUrl : '/' + avatarUrl;
        avatarUrl = `https://nestjs-zvmg.onrender.com${cleanPath}`;
    } else if (!avatarUrl) {
        avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff&bold=true&size=128`;
    }
    
    this.userAvatar = avatarUrl;
    this.userData.fullName = displayName;
  }

  updateCurrentRoute() {
    const url = this.router.url;
    const found = this.menuItems.find(item => url.includes(item.path));
    this.currentRouteTitle = found ? found.label.toUpperCase() : 'BẢNG ĐIỀU KHIỂN';
  }

  loadUserInfo() {
    // This is now handled by the observer in ngOnInit
  }

  isActive(path: string): boolean {
    return this.router.url.includes(path);
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  goToHome() {
    this.router.navigate(['/home']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onAvatarError() {
    const displayName = this.userData?.fullName || 'User';
    this.userAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff&bold=true`;
  }

  menuItems = [
    {
      label: 'Tổng quan',
      path: '/seller/dashboard',
      svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    },
    {
      label: 'Đơn hàng',
      path: '/seller/orders',
      svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    },
    {
      label: 'Sản phẩm',
      path: '/seller/products',
      svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    },
    {
      label: 'Danh mục Shop',
      path: '/seller/categories',
      svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    },
    {
      label: 'Thương hiệu',
      path: '/seller/brands',
      svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
    },
    {
      label: 'Đăng sản phẩm',
      path: '/seller/product-upload',
      svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    },
    {
      label: 'Cài đặt Shop',
      path: '/seller/shop-settings',
      svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    }
  ];

  getBreadcrumb(): string {
    const url = this.router.url;
    const found = this.menuItems.find(item => url.includes(item.path.split('/').pop()!));
    return found ? found.label : 'Kênh Người Bán';
  }
}
