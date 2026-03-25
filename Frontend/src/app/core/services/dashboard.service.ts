import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:3000/api/dashboard';
  private orderUrl = 'http://localhost:3000/api/orders';
  private http = inject(HttpClient);

  private getHeaders(): HttpHeaders {
    let token = '';
    // SSR Safe
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('accessToken') || '';
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`, { headers: this.getHeaders() });
  }

  getRecentOrders(): Observable<any> {
    return this.http.get(`${this.apiUrl}/recent-orders`, { headers: this.getHeaders() });
  }

  getTopProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/top-products`, { headers: this.getHeaders() });
  }

  getAllOrdersAdmin(): Observable<any[]> {
    return this.http.get<any[]>(`${this.orderUrl}/admin/all`, { headers: this.getHeaders() }).pipe(
      catchError(() => of([]))
    );
  }
}
