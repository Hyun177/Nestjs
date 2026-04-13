import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface VoucherApplyResult {
  discount: number;
  subtotal: number;
  finalTotal: number;
  items: any[];
}

@Injectable({
  providedIn: 'root',
})
export class VoucherService {
  private apiUrl = 'https://nestjs-zvmg.onrender.com/api/voucher';
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private isBrowser: boolean;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  private getHeaders(): HttpHeaders {
    let token = '';
    if (this.isBrowser) {
      token = localStorage.getItem('accessToken') || '';
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  applyVoucher(code: string, itemIds?: number[]): Observable<VoucherApplyResult> {
    return this.http.post<VoucherApplyResult>(
      `${this.apiUrl}/apply`,
      { code, itemIds },
      { headers: this.getHeaders() },
    );
  }

  getMyVouchers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my`, { headers: this.getHeaders() });
  }

  getPublicVouchers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/public`, { headers: this.getHeaders() });
  }

  collectVoucher(voucherId: number): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/collect`,
      { voucherId },
      { headers: this.getHeaders() },
    );
  }

  getVouchers(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  createVoucher(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data, { headers: this.getHeaders() });
  }

  updateVoucher(id: number, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  deleteVoucher(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
