import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  private apiUrl = 'http://localhost:3000/api/brand';
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

  getBrands(categoryId?: number): Observable<any[]> {
    const params: any = {};
    if (categoryId) params.categoryId = categoryId;
    return this.http.get<any[]>(this.apiUrl, { params });
  }

  getAdminBrands(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/all`, {
      headers: this.getHeaders(),
    });
  }

  getSellerBrands(categoryId?: number): Observable<any[]> {
    const params: any = {};
    if (categoryId) params.categoryId = categoryId;
    return this.http.get<any[]>(`${this.apiUrl}/seller/me`, {
      headers: this.getHeaders(),
      params,
    });
  }

  createBrand(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data, { headers: this.getHeaders() });
  }

  createSellerBrand(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/seller`, data, { headers: this.getHeaders() });
  }

  updateBrand(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  deleteBrand(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  approveBrand(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/approve/${id}`, {}, { headers: this.getHeaders() });
  }
}
