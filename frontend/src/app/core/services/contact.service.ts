import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';

export interface ContactRequest {
  id?: number;
  userId?: number;
  name: string;
  email: string;
  subject?: string;
  message: string;
  status?: string;
  replyMessage?: string;
  repliedAt?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private http = inject(HttpClient);
  private apiUrl = 'https://nestjs-zvmg.onrender.com/api/contact';
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private getHeaders(): HttpHeaders {
    let token = '';
    if (this.isBrowser) {
      token = localStorage.getItem('accessToken') || '';
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  submitRequest(data: ContactRequest): Observable<ContactRequest> {
    return this.http.post<ContactRequest>(this.apiUrl, data);
  }

  getRequests(): Observable<ContactRequest[]> {
    return this.http.get<ContactRequest[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getMyRequests(): Observable<ContactRequest[]> {
    return this.http.get<ContactRequest[]>(`${this.apiUrl}/me`, { headers: this.getHeaders() });
  }

  getRequestById(id: number): Observable<ContactRequest> {
    return this.http.get<ContactRequest>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  replyToRequest(id: number, replyMessage: string): Observable<ContactRequest> {
    return this.http.patch<ContactRequest>(`${this.apiUrl}/${id}/reply`, { replyMessage }, { headers: this.getHeaders() });
  }

  deleteRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
