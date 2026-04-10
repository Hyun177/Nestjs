import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Product } from './product.service';
import { isPlatformBrowser } from '@angular/common';

export interface CartItem {
  id: number;
  productId: number;
  product: Product;
  quantity: number;
  size: string;
  color: string;
}

export interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
  totalPrice: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private apiUrl = 'http://localhost:3000/api/cart';
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private isBrowser: boolean;

  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  cartItems$ = this.cartItemsSubject.asObservable();

  private cartCountSubject = new BehaviorSubject<number>(0);
  cartCount$ = this.cartCountSubject.asObservable();

  // Get current cart items synchronously
  getCurrentCartItems(): CartItem[] {
    return this.cartItemsSubject.value;
  }

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.refreshCart();
    }
  }

  private getHeaders(): HttpHeaders {
    let token = '';
    if (this.isBrowser) {
      token = localStorage.getItem('accessToken') || '';
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  refreshCart() {
    if (!this.isBrowser) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    this.http.get<Cart>(this.apiUrl, { headers: this.getHeaders() }).subscribe({
      next: (cart) => {
        if (cart && cart.items) {
          this.cartItemsSubject.next(cart.items);
          const count = cart.items.reduce((acc, item) => acc + item.quantity, 0);
          this.cartCountSubject.next(count);
        }
      },
      error: (err) => {
        console.error('Error fetching cart', err);
      },
    });
  }

  addToCart(
    productId: number,
    quantity: number,
    size: string = '',
    color: string = '',
  ): Observable<any> {
    const body: any = { productId, quantity };
    if (size) body.size = size;
    if (color) body.color = color;
    return this.http
      .post<any>(`${this.apiUrl}/items`, body, { headers: this.getHeaders() })
      .pipe(tap(() => this.refreshCart()));
  }

  updateItemQuantity(itemId: number, quantity: number): Observable<any> {
    return this.http
      .put<any>(`${this.apiUrl}/items/${itemId}`, { quantity }, { headers: this.getHeaders() })
      .pipe(tap(() => this.refreshCart()));
  }

  removeItem(itemId: number): Observable<any> {
    return this.http
      .delete<any>(`${this.apiUrl}/items/${itemId}`, { headers: this.getHeaders() })
      .pipe(tap(() => this.refreshCart()));
  }

  clearCart(): Observable<any> {
    return this.http
      .delete<any>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(tap(() => this.refreshCart()));
  }

  clearLocalCart() {
    this.cartItemsSubject.next([]);
    this.cartCountSubject.next(0);
  }
}
