import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Product } from './product.service';
import { isPlatformBrowser } from '@angular/common';

export type FavoriteProduct = Product & { isFavorited?: boolean };

@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  private apiUrl = 'http://localhost:3000/api/favorite';
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private readonly STORAGE_KEY = 'user_favorite_ids';

  // Signal-based favorites for offline/client-side support
  favoriteIds = signal<number[]>([]);
  favoriteProducts = signal<FavoriteProduct[]>([]);

  private favoritesSubject = new BehaviorSubject<any[]>([]);
  favorites$ = this.favoritesSubject.asObservable();

  constructor() {
    this.loadLocalFavorites();
  }

  private loadLocalFavorites() {
    if (!this.isBrowser) return;
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const ids = JSON.parse(stored);
        this.favoriteIds.set(ids);
      } catch (error) {
        console.error('Failed to load local favorites:', error);
        this.favoriteIds.set([]);
      }
    }
  }

  private saveLocalFavorites() {
    if (!this.isBrowser) return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.favoriteIds()));
  }

  private getHeaders(): HttpHeaders {
    const token = this.isBrowser ? localStorage.getItem('accessToken') : '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  toggleFavorite(productId: number): Observable<any> {
    // Update local favorites immediately for better UX
    if (this.isFavoriteLocal(productId)) {
      this.removeFavoriteLocal(productId);
    } else {
      this.addFavoriteLocal(productId);
    }

    // Also sync with backend
    return this.http.post<any>(`${this.apiUrl}/${productId}`, {}, { headers: this.getHeaders() });
  }

  /**
   * Add to favorites locally
   */
  addFavoriteLocal(productId: number) {
    if (!this.isFavoriteLocal(productId)) {
      this.favoriteIds.update((ids) => [...ids, productId]);
      this.saveLocalFavorites();
    }
  }

  /**
   * Remove from favorites locally
   */
  removeFavoriteLocal(productId: number) {
    this.favoriteIds.update((ids) => ids.filter((id) => id !== productId));
    this.favoriteProducts.update((products) => products.filter((p) => p.id !== productId));
    this.saveLocalFavorites();
  }

  /**
   * Check if favorite locally
   */
  isFavoriteLocal(productId: number): boolean {
    return this.favoriteIds().includes(productId);
  }

  /**
   * Set favorite products (with full details)
   */
  setFavoriteProducts(products: FavoriteProduct[]) {
    this.favoriteProducts.set(products);
    this.favoriteIds.set(products.map((p) => p.id));
  }

  /**
   * Add favorite product with details
   */
  addFavoriteProduct(product: FavoriteProduct) {
    if (!this.isFavoriteLocal(product.id)) {
      this.favoriteProducts.update((products) => [...products, product]);
      this.addFavoriteLocal(product.id);
    }
  }

  /**
   * Get favorite products
   */
  getFavoriteProducts(): FavoriteProduct[] {
    return this.favoriteProducts();
  }

  /**
   * Get favorite count
   */
  getFavoritesCount(): number {
    return this.favoriteIds().length;
  }

  getFavorites(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      tap((favs) => {
        this.favoritesSubject.next(favs);
        this.setFavoriteProducts(favs);
      }),
    );
  }

  isFavorite(productId: number): Observable<{ isFavorite: boolean }> {
    return this.http.get<{ isFavorite: boolean }>(`${this.apiUrl}/${productId}/check`, {
      headers: this.getHeaders(),
    });
  }
}
