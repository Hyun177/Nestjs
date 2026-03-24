import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
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
          import('./pages/auth/hompage/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./pages/auth/cart/cart.component').then((m) => m.CartComponent),
      },
    ],
  },
  {
    path: 'admin/products',
    canActivate: [roleGuard],
    data: { roles: ['admin', 'manager'] },
    loadComponent: () =>
      import('./pages/admin/product-upload/product-upload.component').then(
        (m) => m.ProductUploadComponent
      ),
  },
  {
    path: 'manager/home',
    canActivate: [roleGuard],
    data: { roles: ['manager'] },
    loadComponent: () =>
      import('./pages/manager/manager-home/manager-home.component').then(
        (m) => m.ManagerHomeComponent
      ),
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
