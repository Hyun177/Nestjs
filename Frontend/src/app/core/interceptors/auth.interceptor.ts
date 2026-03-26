import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NzMessageService } from 'ng-zorro-antd/message';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const router = inject(Router);
  const message = inject(NzMessageService);

  // Skip auth for VNPAY return URL if needed
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized (expired or invalid token)
      if (error.status === 401) {
        // Use injector to get AuthService lazily to avoid circular dependency
        const authService = injector.get(AuthService);
        authService.logout();
        
        // Only redirect and message if in browser
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            const currentPath = router.url;
            if (!currentPath.includes('/login') && !currentPath.includes('/register') && !currentPath.includes('/home') && !currentPath.includes('/product/')) {
                message.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                router.navigate(['/login']);
            }
        }
      }
      return throwError(() => error);
    })
  );
};
