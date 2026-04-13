import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ShopService {
  private http = inject(HttpClient);
  private apiUrl = 'https://nestjs-zvmg.onrender.com/api/shop';

  getShopBySeller(sellerId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/seller/${sellerId}`);
  }

  getShopById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getMyShop(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`);
  }

  updateShop(data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/me`, data);
  }

  searchShops(q: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/search`, { params: { q } });
  }
}
