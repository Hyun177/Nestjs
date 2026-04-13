import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Province { code: string; name: string; }
export interface Ward { code: string; name: string; }

@Injectable({ providedIn: 'root' })
export class LocationService {
  private apiUrl = 'http://localhost:3000/api/location';
  private http = inject(HttpClient);

  getProvinces(): Observable<Province[]> {
    return this.http.get<Province[]>(`${this.apiUrl}/provinces`);
  }

  getWards(provinceCode: string): Observable<Ward[]> {
    return this.http.get<Ward[]>(`${this.apiUrl}/wards/${provinceCode}`);
  }
}
