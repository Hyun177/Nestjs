import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SellerRequestService } from '../../../core/services/seller-request.service';

@Component({
  selector: 'app-admin-seller-requests',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="admin-requests-page">
      <div class="page-header">
        <div class="header-inner">
          <div class="title-group">
            <h1>Seller Approvals</h1>
            <p>Review and manage vendor registration requests</p>
          </div>
          <div class="header-actions">
             <button class="refresh-btn" (click)="loadRequests()">
               <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M23 4v6h-6M1 20v-6h6" />
                 <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
               </svg>
               Refresh
             </button>
          </div>
        </div>
      </div>

      <div class="content-body">
        <div *ngIf="loading" class="loading-overlay-custom">
          <div class="custom-spinner"></div>
          <p>Fetching requests...</p>
        </div>

        <div class="table-container-custom" *ngIf="!loading">
          <table class="premium-table">
            <thead>
              <tr>
                <th>User Account</th>
                <th>Shop Details</th>
                <th>Contact Phone</th>
                <th>Status</th>
                <th class="actions-col">Operations</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let req of requests" class="request-row">
                <td>
                  <div class="user-cell">
                    <span class="main-text">{{ req.user?.email }}</span>
                    <span class="sub-text">UID: {{ req.userId }}</span>
                  </div>
                </td>
                <td>
                  <div class="shop-cell">
                    <span class="main-text">{{ req.shopName }}</span>
                    <span class="sub-text">{{ req.shopDescription || 'No description provided' }}</span>
                  </div>
                </td>
                <td>
                   <span class="phone-tag">{{ req.phone }}</span>
                </td>
                <td>
                   <div class="status-pill" [style.color]="getStatusCfg(req.status).color" [style.backgroundColor]="getStatusCfg(req.status).bg">
                      <span class="dot" [style.backgroundColor]="getStatusCfg(req.status).color"></span>
                      {{ getStatusCfg(req.status).label }}
                   </div>
                </td>
                <td class="actions-col">
                   <div class="btn-group" *ngIf="req.status === 'PENDING'">
                      <button class="approve-btn" (click)="approve(req.id)">Approve</button>
                      <button class="reject-btn" (click)="reject(req.id)">Reject</button>
                   </div>
                   <div class="completed-msg" *ngIf="req.status !== 'PENDING'">
                      Decision Logged
                   </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="empty-state-custom" *ngIf="requests.length === 0">
             <div class="empty-vector">📥</div>
             <h3>No Pending Requests</h3>
             <p>All seller registrations have been processed.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-requests-page {
      min-height: 100vh;
      background: #f8fafc;
      padding-bottom: 40px;
    }

    .page-header {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 32px 40px;
      margin-bottom: 32px;

      .header-inner {
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
      }

      .title-group {
        h1 { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
        p { color: #64748b; font-size: 15px; margin: 0; }
      }
    }

    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 10px;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      color: #475569;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      &:hover { background: #f8fafc; transform: translateY(-1px); }
    }

    .content-body {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 40px;
    }

    .table-container-custom {
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .premium-table {
      width: 100%;
      border-collapse: collapse;
      
      th {
        background: #f8fafc;
        padding: 18px 24px;
        text-align: left;
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
        border-bottom: 1px solid #e2e8f0;
      }

      td {
        padding: 20px 24px;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
      }

      .request-row:hover { background: #fbfcfe; }
    }

    .user-cell, .shop-cell {
      display: flex;
      flex-direction: column;
      .main-text { font-weight: 600; color: #0f172a; font-size: 15px; }
      .sub-text { font-size: 13px; color: #94a3b8; }
    }

    .phone-tag {
      background: #f1f5f9;
      padding: 4px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 99px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.02em;

      .dot { width: 6px; height: 6px; border-radius: 50%; }
    }

    .actions-col { text-align: right; }

    .btn-group {
      display: flex;
      gap: 10px;
      justify-content: flex-end;

      button {
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        border: none;
        transition: all 0.2s;

        &.approve-btn {
          background: #0f172a;
          color: #ffffff;
          &:hover { background: #1e293b; transform: scale(1.05); }
        }

        &.reject-btn {
          background: #ffffff;
          border: 1.5px solid #ef4444;
          color: #ef4444;
          &:hover { background: #fef2f2; transform: scale(1.05); }
        }
      }
    }

    .completed-msg { color: #94a3b8; font-size: 13px; font-style: italic; }

    .loading-overlay-custom {
      padding: 80px;
      text-align: center;
      color: #64748b;
    }

    .custom-spinner {
      width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #0f172a;
      border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;
    }

    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    .empty-state-custom {
       padding: 80px; text-align: center;
       .empty-vector { font-size: 48px; margin-bottom: 20px; }
       h3 { font-size: 20px; color: #0f172a; margin-bottom: 8px; }
       p { color: #64748b; }
    }
  `]
})
export class AdminSellerRequestsComponent implements OnInit {
  private sellerRequestService = inject(SellerRequestService);
  private cdr = inject(ChangeDetectorRef);

  requests: any[] = [];
  loading = false;

  private readonly statusConfig: Record<string, { color: string; label: string; bg: string }> = {
    PENDING: { color: '#f59e0b', label: 'Waiting Review', bg: '#fef3c7' },
    APPROVED: { color: '#10b981', label: 'Active Seller', bg: '#d1fae5' },
    REJECTED: { color: '#ef4444', label: 'Request Denied', bg: '#fee2e2' },
  };

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests() {
    this.loading = true;
    this.sellerRequestService.getAllRequests().subscribe({
      next: (res) => {
        this.requests = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getStatusCfg(status: string) {
    return this.statusConfig[status] || { color: '#64748b', label: status, bg: '#f1f5f9' };
  }

  approve(id: number) {
    if (!confirm('Are you sure you want to approve this seller registration?')) return;
    this.sellerRequestService.approveRequest(id).subscribe({
      next: () => {
        this.loadRequests();
      }
    });
  }

  reject(id: number) {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason === null) return;
    this.sellerRequestService.rejectRequest(id, reason).subscribe({
       next: () => {
         this.loadRequests();
       }
    });
  }
}
