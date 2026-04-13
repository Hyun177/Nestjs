import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  image: string;
  stock: number;
  categoryId: number;
  brandId: number;
  rating: number;
  numReviews: number;
  soldCount?: number;
  viewCount?: number;
  labels?: string[];
  specs?: { icon: string; text: string }[];
  promoNote?: string;
  isFeatured?: boolean;
  isArchived?: boolean;
  category?: any;
  brand?: any;
  images?: string[];
  userId?: number;
  attributes?: { name: string; options: string[] }[];
  variants?: {
    sku: string;
    price: number;
    stock: number;
    attributes: { [key: string]: string };
  }[];
  shop?: any;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = 'https://nestjs-zvmg.onrender.com/api/product';
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  getProducts(params?: any): Observable<Product[]> {
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => response.data ? response.data : response)
    );
  }

  getProductsPaginated(params?: any): Observable<any> {
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => response)
    );
  }

  getTopSelling(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/top-selling`);
  }

  getRecommended(productId: number, brandId: number, categoryId: number): Observable<Product[]> {
    return this.http.get<any>(`${this.apiUrl}?pageSize=8&brandId=${brandId}&excludeId=${productId}`).pipe(
      map(res => {
        const items: Product[] = res.data ? res.data : (Array.isArray(res) ? res : []);
        // Filter out current product
        const filtered = items.filter(p => p.id !== productId);
        if (filtered.length >= 4) return filtered.slice(0, 8);
        return filtered; // will fallback to category/top-selling in component
      })
    );
  }

  getByCategory(categoryId: number, excludeId: number): Observable<Product[]> {
    return this.http.get<any>(`${this.apiUrl}?pageSize=8&categoryId=${categoryId}`).pipe(
      map(res => {
        const items: Product[] = res.data ? res.data : (Array.isArray(res) ? res : []);
        return items.filter(p => p.id !== excludeId).slice(0, 8);
      })
    );
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  private getHeaders(): HttpHeaders {
    let token = '';
    if (this.isBrowser) {
      token = localStorage.getItem('accessToken') || '';
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  createProduct(formData: FormData): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, formData, { headers: this.getHeaders() });
  }

  updateProduct(id: number, data: any): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
