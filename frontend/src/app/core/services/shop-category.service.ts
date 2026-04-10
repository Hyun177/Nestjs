import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ShopCategoryService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/shop-category';

  create(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  findAllByShop(shopId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/shop/${shopId}`);
  }

  findMyCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/me`);
  }

  update(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, data);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
