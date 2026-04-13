import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface UserAddress {
  id?: number;
  fullName: string;
  phone: string;
  provinceCode: string;
  provinceName: string;
  wardCode?: string;
  wardName?: string;
  detail: string;
  isDefault?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AddressService {
  private apiUrl = 'https://nestjs-zvmg.onrender.com/api/address';
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private getHeaders(): HttpHeaders {
    let token = '';
    if (isPlatformBrowser(this.platformId)) token = localStorage.getItem('accessToken') || '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getAll(): Observable<UserAddress[]> {
    return this.http.get<UserAddress[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  create(dto: UserAddress): Observable<UserAddress> {
    return this.http.post<UserAddress>(this.apiUrl, dto, { headers: this.getHeaders() });
  }

  update(id: number, dto: UserAddress): Observable<UserAddress> {
    return this.http.put<UserAddress>(`${this.apiUrl}/${id}`, dto, { headers: this.getHeaders() });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  setDefault(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/default`, {}, { headers: this.getHeaders() });
  }
}
