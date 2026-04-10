import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SellerRequestService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/seller-request';

  submitRequest(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getMyRequests(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`);
  }

  // Admin methods
  getAllRequests(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin`);
  }

  approveRequest(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectRequest(id: number, reason: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/reject`, { rejectionReason: reason });
  }
}
