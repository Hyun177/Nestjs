import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { CartService } from './cart.service';

export interface RegisterRequest {
  firstname: string;
  lastname: string;
  email: string;
  password?: string;
}

export interface User {
  id: number;
  name?: string;
  firstname: string;
  lastname: string;
  email: string;
  avatar?: string;
  roles: string[];
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'https://nestjs-zvmg.onrender.com/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    private cartService: CartService,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');

      if (savedUser && token) {
        if (this.isTokenExpired(token)) {
          this.logout();
        } else {
          try {
            this.currentUserSubject.next(JSON.parse(savedUser));
          } catch (e) {
            this.logout();
          }
        }
      } else {
        this.logout();
      }
    }
  }

  private isTokenExpired(token: string): boolean {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return false; // If no exp, assume valid
      return payload.exp * 1000 < Date.now();
    } catch (e) {
      return true;
    }
  }

  public get isAuthenticated(): boolean {
    const token = this.isBrowser ? localStorage.getItem('accessToken') : null;
    return !!this.currentUserSubject.value && !!token && !this.isTokenExpired(token);
  }

  register(data: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: any): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((res) => {
        this.currentUserSubject.next(res.user);
        if (this.isBrowser) {
          localStorage.setItem('user', JSON.stringify(res.user));
          localStorage.setItem('accessToken', res.access_token);
          localStorage.setItem('refreshToken', res.refresh_token);
          this.cartService.refreshCart();
        }
      }),
    );
  }

  loginWithGoogle(credential: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/google`, { credential }).pipe(
      tap((res) => {
        this.currentUserSubject.next(res.user);
        if (this.isBrowser) {
          localStorage.setItem('user', JSON.stringify(res.user));
          localStorage.setItem('accessToken', res.access_token);
          localStorage.setItem('refreshToken', res.refresh_token);
          this.cartService.refreshCart();
        }
      }),
    );
  }

  getUserId(): number | null {
    return this.currentUserSubject.value?.id || null;
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  logout() {
    if (this.isBrowser) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      this.cartService.clearLocalCart();
    }
    this.currentUserSubject.next(null);
  }
}
