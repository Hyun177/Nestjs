import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { SellerLayoutComponent } from './layout/seller-layout/seller-layout.component';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./pages/hompage/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./pages/cart/cart.component').then((m) => m.CartComponent),
      },
      {
        path: 'order-confirm',
        loadComponent: () =>
          import('./pages/order-confirm/order-confirm.component').then((m) => m.OrderConfirmComponent),
      },
      {
        path: 'order-success',
        loadComponent: () =>
          import('./pages/order-success/order-success.component').then((m) => m.OrderSuccessComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/products/products.component').then((m) => m.ProductsComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'product/:id',
        loadComponent: () =>
          import('./pages/product-detail/product-detail.component').then(
            (m) => m.ProductDetailComponent,
          ),
      },
      {
        path: 'payment-success',
        loadComponent: () =>
          import('./pages/payment-result/payment-result').then((m) => m.PaymentResultComponent),
      },
      {
        path: 'payment-failed',
        loadComponent: () =>
          import('./pages/payment-result/payment-result').then((m) => m.PaymentResultComponent),
      },
      {
        path: 'seller/register',
        loadComponent: () =>
          import('./pages/seller-registration/seller-registration.component').then((m) => m.SellerRegistrationComponent),
      },
      {
        path: 'shop/:sellerId',
        loadComponent: () =>
          import('./pages/shop/shop.component').then((m) => m.ShopComponent),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./pages/chat/chat.component').then((m) => m.ChatComponent),
      },
      {
        path: 'about',
        loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
      },
      {
        path: 'contact',
        loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
      },
      {
        path: 'faq',
        loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
      },
      {
        path: 'terms',
        loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
      },
      {
        path: 'privacy',
        loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
      },
      {
        path: 'shipping',
        loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
      },
      {
        path: 'features',
        loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
      },
      {
        path: 'works',
        loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
      },
      {
        path: 'career',
        loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
      },
      {
        path: 'account-info',
        loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
      },
      {
        path: 'deliveries',
        loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
      },
      {
        path: 'orders-info',
        loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
      },
      {
        path: 'payments-info',
        loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
      }
    ],
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [roleGuard],
    data: { roles: ['admin', 'manager'] },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/admin/users/admin-users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/admin/orders/admin-orders.component').then((m) => m.AdminOrdersComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/admin/products/admin-products.component').then(
            (m) => m.AdminProductsComponent,
          ),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/admin/categories/admin-categories.component').then(
            (m) => m.AdminCategoriesComponent,
          ),
      },
      {
        path: 'brands',
        loadComponent: () =>
          import('./pages/admin/brands/admin-brands.component').then((m) => m.AdminBrandsComponent),
      },
      {
        path: 'vouchers',
        loadComponent: () =>
          import('./pages/admin/vouchers/admin-voucher.component').then((m) => m.AdminVoucherComponent),
      },
      {
        path: 'favorites',
        loadComponent: () =>
          import('./pages/admin/favorites/admin-favorites.component').then(
            (m) => m.AdminFavoritesComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'shops',
        loadComponent: () =>
          import('./pages/admin/shops/admin-shops.component').then((m) => m.AdminShopsComponent),
      },
      {
        path: 'seller-requests',
        loadComponent: () =>
          import('./pages/admin/seller-requests/admin-seller-requests.component').then((m) => m.AdminSellerRequestsComponent),
      },
      {
        path: 'support',
        loadComponent: () =>
          import('./pages/admin/support/admin-support.component').then((m) => m.AdminSupportComponent),
      }
    ],
  },
  {
    path: 'admin/product-upload',
    canActivate: [roleGuard],
    data: { roles: ['admin', 'manager'] },
    loadComponent: () =>
      import('./pages/admin/product-upload/product-upload.component').then(
        (m) => m.ProductUploadComponent,
      ),
  },
  {
    path: 'manager/home',
    canActivate: [roleGuard],
    data: { roles: ['manager'] },
    loadComponent: () =>
      import('./pages/manager/manager-home/manager-home.component').then(
        (m) => m.ManagerHomeComponent,
      ),
  },
  {
    path: 'seller',
    component: SellerLayoutComponent,
    canActivate: [roleGuard],
    data: { roles: ['seller'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/seller/dashboard/seller-dashboard.component').then(
            (m) => m.SellerDashboardComponent,
          ),
      },
      {
        path: 'product-upload',
        loadComponent: () =>
          import('./pages/seller/product-upload/seller-product-upload.component').then(
            (m) => m.SellerProductUploadComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/seller/orders/seller-orders.component').then(
            (m) => m.SellerOrdersComponent,
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/seller/products/seller-products.component').then(
            (m) => m.SellerProductsComponent,
          ),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/seller/categories/seller-categories.component').then(
            (m) => m.SellerCategoriesComponent,
          ),
      },
      {
        path: 'brands',
        loadComponent: () =>
          import('./pages/seller/brands/seller-brands.component').then(
            (m) => m.SellerBrandsComponent,
          ),
      },
      {
        path: 'shop-settings',
        loadComponent: () =>
          import('./pages/seller/shop-settings/seller-shop-settings.component').then(
            (m) => m.SellerShopSettingsComponent,
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
