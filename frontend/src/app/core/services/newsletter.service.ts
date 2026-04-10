import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NewsletterService {
  private apiUrl = 'http://localhost:3000/api/newsletter';

  constructor(private http: HttpClient) {}

  me(): Observable<{ subscribed: boolean; email: string | null }> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;
    return this.http.get<{ subscribed: boolean; email: string | null }>(`${this.apiUrl}/me`, {
      headers,
    });
  }

  subscribe(email: string): Observable<{ subscribed: boolean }> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;
    return this.http.post<{ subscribed: boolean }>(
      `${this.apiUrl}/subscribe`,
      {
        email,
      },
      { headers },
    );
  }
}
