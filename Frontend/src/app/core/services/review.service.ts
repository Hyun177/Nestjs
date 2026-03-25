import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = 'http://127.0.0.1:3000/api/review';
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private getHeaders(): HttpHeaders {
    let token = '';
    if (this.isBrowser) {
      token = localStorage.getItem('accessToken') || '';
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getProductReviews(productId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/product/${productId}`);
  }

  canReview(productId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/can-review/${productId}`, { headers: this.getHeaders() });
  }

  submitReview(formData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, formData, { headers: this.getHeaders() });
  }
}
