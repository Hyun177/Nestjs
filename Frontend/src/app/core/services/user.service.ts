import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api/users';
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

  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile`, { headers: this.getHeaders() });
  }

  updateProfile(data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/profile`, data, { headers: this.getHeaders() });
  }

  changePassword(data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/change-password`, data, { headers: this.getHeaders() });
  }

  uploadAvatar(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/profile/avatar`, formData, { headers: this.getHeaders() });
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`, { headers: this.getHeaders() });
  }

  updateUserAdmin(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  createUserAdmin(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, data, { headers: this.getHeaders() });
  }

  deleteUserAdmin(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
