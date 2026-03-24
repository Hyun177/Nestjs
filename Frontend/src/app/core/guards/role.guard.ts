import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as string[];

  return authService.currentUser$.pipe(
    take(1),
    map((user) => {
      if (!user) {
        return router.parseUrl('/login');
      }

      const hasRole = user.roles.some((role) => allowedRoles.includes(role));
      if (!hasRole) {
        return router.parseUrl('/home');
      }

      return true;
    })
  );
};
