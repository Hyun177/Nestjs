import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { CategoryService } from '../../../core/services/category.service';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-seller-brands',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NzIconModule, NzPopconfirmModule, NzSelectModule],
  template: `
    <div class="seller-brands">
      <!-- Header -->
      <div class="page-header">
        <div class="title-wrap">
          <h2>Quản lý Thương hiệu</h2>
          <p>Danh sách thương hiệu — bạn có thể tạo thương hiệu mới để dùng khi đăng sản phẩm.</p>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <input
          type="text"
          placeholder="🔍  Tìm kiếm thương hiệu..."
          class="search-input"
          [(ngModel)]="searchValue"
        />
        <button class="seller-btn seller-btn-primary" style="height: 44px;" (click)="openAddModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Thêm thương hiệu
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="loading-state">
        <div class="spinner"></div>
        <p>Đang tải thương hiệu...</p>
      </div>

      <!-- Table -->
      <div *ngIf="!loading()" class="table-wrap">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Thương hiệu</th>
              <th>Danh mục</th>
              <th>Mô tả</th>
              <th style="text-align:right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let b of filteredBrands">
              <td>
                <div class="brand-info">
                  <div class="brand-avatar">{{ b.name.charAt(0).toUpperCase() }}</div>
                  <span class="brand-name">{{ b.name }}</span>
                </div>
              </td>
              <td>
                <span style="font-size: 0.8rem; background: #f1f5f9; padding: 4px 10px; border-radius: 12px; color: #64748b" *ngIf="b.category">
                  {{ b.category.name }}
                </span>
                <span style="color: #cbd5e1" *ngIf="!b.category">—</span>
              </td>
              <td class="desc-cell">{{ b.description || '—' }}</td>
              <td class="actions-cell">
                <button class="seller-btn seller-btn-default seller-btn-icon-only" style="padding: 6px; border: 1px solid transparent; box-shadow: none; color: #f59e0b" (click)="openEditModal(b)" title="Sửa">
                  <span nz-icon nzType="edit"></span>
                </button>
              </td>
            </tr>
            <tr *ngIf="filteredBrands.length === 0">
              <td colspan="3" class="empty">Không tìm thấy thương hiệu nào</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal -->
      <div class="modal-overlay" [class.active]="modalVisible">
        <div class="modal" [class.active]="modalVisible">
          <div class="modal-header">
            <h3>{{ isEdit ? 'Chỉnh sửa thương hiệu' : 'Thêm thương hiệu mới' }}</h3>
            <button class="close-btn" (click)="handleCancel()">&#x2715;</button>
          </div>
          <div class="modal-body">
            <form [formGroup]="brandForm">
              <div class="form-group">
                <label>Tên thương hiệu <span class="req">*</span></label>
                <input formControlName="name" placeholder="Ví dụ: Apple, Samsung, Nike..." />
                <span class="err" *ngIf="brandForm.get('name')?.invalid && brandForm.get('name')?.touched">Vui lòng nhập tên thương hiệu</span>
              </div>
              <div class="form-group">
                <label>Danh mục cha <span class="req">*</span></label>
                <nz-select formControlName="categoryId" nzPlaceHolder="Chọn danh mục cha" style="width: 100%;">
                  <nz-option *ngFor="let cat of categories()" [nzValue]="cat.id" [nzLabel]="cat.name"></nz-option>
                </nz-select>
                <span class="err" *ngIf="brandForm.get('categoryId')?.invalid && brandForm.get('categoryId')?.touched">Vui lòng chọn danh mục</span>
              </div>
              <div class="form-group">
                <label>Mô tả</label>
                <textarea formControlName="description" rows="3" placeholder="Mô tả ngắn về thương hiệu..."></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="seller-btn seller-btn-default" (click)="handleCancel()">Hủy bỏ</button>
            <button class="seller-btn seller-btn-primary" [disabled]="brandForm.invalid || saving()" (click)="handleOk()">
              <span *ngIf="saving()">Đang lưu...</span>
              <span *ngIf="!saving()">{{ isEdit ? 'Lưu thay đổi' : 'Tạo mới' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .seller-brands { max-width: 1200px; margin: 0 auto; }

    .page-header { margin-bottom: 28px; }
    .page-header h2 { font-size: 1.7rem; font-weight: 800; color: #0f172a; margin: 0; }
    .page-header p { color: #64748b; font-size: 0.875rem; margin: 6px 0 0; }

    .action-bar { display: flex; gap: 14px; margin-bottom: 20px; background: #fff; padding: 16px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; }
    .search-input { flex: 1; padding: 11px 18px; border-radius: 12px; border: 1.5px solid #e2e8f0; font-size: 0.9rem; outline: none; background: #f8fafc; transition: all 0.2s; }
    .search-input:focus { border-color: #f59e0b; background: #fff; box-shadow: 0 0 0 3px rgba(245,158,11,0.1); }

    .loading-state { display: flex; flex-direction: column; align-items: center; padding: 60px; color: #94a3b8; }
    .spinner { width: 36px; height: 36px; border: 4px solid #f1f5f9; border-top-color: #f59e0b; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 14px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .table-wrap { background: #fff; border-radius: 20px; border: 1px solid #f1f5f9; box-shadow: 0 8px 24px rgba(0,0,0,0.04); overflow: hidden; }
    .custom-table { width: 100%; border-collapse: collapse; }
    .custom-table thead th { padding: 14px 24px; text-align: left; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; background: #f8fafc; border-bottom: 1.5px solid #edf1f7; }
    .custom-table tbody tr { transition: background 0.15s; }
    .custom-table tbody tr:hover { background: #fafbff; }
    .custom-table tbody td { padding: 16px 24px; border-bottom: 1px solid #f8fafc; font-size: 0.9rem; color: #1e293b; }
    .custom-table tbody tr:last-child td { border-bottom: none; }

    .brand-info { display: flex; align-items: center; gap: 14px; }
    .brand-avatar { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #f59e0b, #ef4444); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem; flex-shrink: 0; }
    .brand-name { font-weight: 700; color: #0f172a; }
    .desc-cell { color: #64748b; }

    .actions-cell { display: flex; gap: 8px; justify-content: flex-end; }

    .empty { text-align: center; color: #94a3b8; padding: 48px; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.45); backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; opacity: 0; visibility: hidden; transition: all 0.3s; }
    .modal-overlay.active { opacity: 1; visibility: visible; }
    .modal { background: #fff; border-radius: 24px; width: 100%; max-width: 480px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); transform: translateY(30px); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); overflow: hidden; }
    .modal.active { transform: translateY(0); }
    .modal-header { padding: 22px 28px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .modal-header h3 { margin: 0; font-size: 1.15rem; font-weight: 800; color: #0f172a; }
    .close-btn { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #94a3b8; line-height: 1; }
    .close-btn:hover { color: #ef4444; }
    .modal-body { padding: 28px; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }
    .req { color: #ef4444; }
    .form-group input, .form-group textarea { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: #f8fafc; outline: none; font-size: 0.9rem; transition: all 0.2s; box-sizing: border-box; }
    .form-group input:focus, .form-group textarea:focus { border-color: #f59e0b; background: #fff; box-shadow: 0 0 0 3px rgba(245,158,11,0.1); }
    .err { font-size: 0.75rem; color: #ef4444; margin-top: 4px; display: block; }
    .modal-footer { padding: 20px 28px; background: #f8fafc; display: flex; justify-content: flex-end; gap: 10px; }
  `]
})
export class SellerBrandsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private categoryService = inject(CategoryService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  private apiBase = 'http://localhost:3000/api/brand';

  loading = signal(true);
  saving = signal(false);
  brands = signal<any[]>([]);
  categories = signal<any[]>([]);
  searchValue = '';
  modalVisible = false;
  isEdit = false;
  editId: number | null = null;

  brandForm = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    categoryId: [null as number | null, [Validators.required]],
  });

  private getHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') || '' : '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  ngOnInit() { 
    this.loadBrands(); 
    this.loadCategories();
  }

  loadCategories() {
    this.categoryService.getSellerCategories().subscribe(res => this.categories.set(res));
  }

  loadBrands() {
    this.loading.set(true);
    // Dùng endpoint seller/me để lấy brands (seller-authenticated)
    this.http.get<any[]>(`${this.apiBase}/seller/me`, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        this.brands.set(res || []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        // Fallback: public endpoint
        this.http.get<any[]>(this.apiBase).subscribe({
          next: (res) => { this.brands.set(res || []); this.loading.set(false); this.cdr.detectChanges(); },
          error: () => { this.brands.set([]); this.loading.set(false); }
        });
      }
    });
  }

  get filteredBrands() {
    const s = this.searchValue.toLowerCase();
    if (!s) return this.brands();
    return this.brands().filter(b =>
      b.name.toLowerCase().includes(s) || (b.description || '').toLowerCase().includes(s)
    );
  }

  openAddModal() {
    this.isEdit = false;
    this.editId = null;
    this.brandForm.reset();
    this.modalVisible = true;
  }

  openEditModal(brand: any) {
    this.isEdit = true;
    this.editId = brand.id;
    this.brandForm.patchValue({ 
      name: brand.name, 
      description: brand.description,
      categoryId: brand.categoryId
    });
    this.modalVisible = true;
  }

  handleCancel() {
    this.modalVisible = false;
    this.brandForm.reset();
  }

  handleOk() {
    if (this.brandForm.invalid) { this.brandForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const val = this.brandForm.getRawValue();

    const req = this.isEdit && this.editId
      ? this.http.put(`${this.apiBase}/${this.editId}`, val, { headers: this.getHeaders() })
      : this.http.post(`${this.apiBase}/seller`, val, { headers: this.getHeaders() });

    req.subscribe({
      next: () => {
        this.message.success(this.isEdit ? 'Đã cập nhật thương hiệu' : 'Đã thêm thương hiệu mới');
        this.saving.set(false);
        this.modalVisible = false;
        this.loadBrands();
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Có lỗi xảy ra');
        this.saving.set(false);
      }
    });
  }
}
