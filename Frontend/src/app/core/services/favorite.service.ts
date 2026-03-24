import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Product } from './product.service';

@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  private apiUrl = 'http://localhost:3000/favorite';
  private http = inject(HttpClient);

  private favoritesSubject = new BehaviorSubject<any[]>([]);
  favorites$ = this.favoritesSubject.asObservable();

  private getHeaders(): HttpHeaders {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  toggleFavorite(productId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${productId}`, {}, { headers: this.getHeaders() });
  }

  getFavorites(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      tap(favs => this.favoritesSubject.next(favs))
    );
  }

  isFavorite(productId: number): Observable<{ isFavorite: boolean }> {
    return this.http.get<{ isFavorite: boolean }>(`${this.apiUrl}/${productId}/check`, { headers: this.getHeaders() });
  }
}
