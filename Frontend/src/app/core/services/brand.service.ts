import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  private apiUrl = 'http://localhost:3000/brand';
  private http = inject(HttpClient);

  getBrands(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
