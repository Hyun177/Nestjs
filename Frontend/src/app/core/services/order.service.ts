import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private apiUrl = 'http://localhost:3000/api/order';
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

  getHistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/history`, { headers: this.getHeaders() });
  }

  getOrderById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  checkout(data: { voucherCode?: string; paymentMethod: string; itemIds?: number[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}/checkout`, data, { headers: this.getHeaders() });
  }

  getAllOrdersAdmin(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all/admin`, { headers: this.getHeaders() });
  }

  updateOrderStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status }, { headers: this.getHeaders() });
  }

  deleteOrderAdmin(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  updateOrderAdmin(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  cancelOrder(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/cancel`, {}, { headers: this.getHeaders() });
  }
}
