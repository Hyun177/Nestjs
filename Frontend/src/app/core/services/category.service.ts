import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private apiUrl = 'http://127.0.0.1:3000/api/category';
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

  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getSellerCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/seller/me`, { headers: this.getHeaders() });
  }

  createCategory(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data, { headers: this.getHeaders() });
  }

  createSellerCategory(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/seller`, data, { headers: this.getHeaders() });
  }

  updateCategory(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  updateSellerCategory(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/seller/${id}`, data, { headers: this.getHeaders() });
  }

  deleteSellerCategory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/seller/${id}`, { headers: this.getHeaders() });
  }

  getAllCategoriesAdmin(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/all`, { headers: this.getHeaders() });
  }

  approveCategory(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/approve/${id}`, {}, { headers: this.getHeaders() });
  }
}
