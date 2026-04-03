import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../../core/services/category.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

@Component({
  selector: 'app-seller-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzTableModule, NzModalModule, NzInputModule, NzFormModule, NzIconModule, NzPopconfirmModule],
  template: `
    <div class="seller-categories-page">
      <div class="header">
        <div class="title-wrap">
          <h2>Quản lý danh mục Shop</h2>
          <p>Tổ chức và phân loại sản phẩm của bạn</p>
        </div>
        <button class="seller-btn seller-btn-primary" (click)="openAddModal()">
          <span nz-icon nzType="plus"></span> Thêm danh mục
        </button>
      </div>

      <nz-table #basicTable [nzData]="categories" [nzLoading]="loading">
        <thead>
          <tr>
            <th>Tên danh mục</th>
            <th>Mô tả</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let data of basicTable.data">
            <td>{{ data.name }}</td>
            <td>{{ data.description || '—' }}</td>
            <td>
              <div class="action-btns">
                <button class="seller-btn seller-btn-default" style="padding: 6px 12px; font-size: 0.8rem;" (click)="editCategory(data)">Sửa</button>
                <button class="seller-btn seller-btn-danger" style="padding: 6px 12px; font-size: 0.8rem;"
                   nz-popconfirm nzPopconfirmTitle="Xóa danh mục này?" 
                   (nzOnConfirm)="deleteCategory(data.id)">Xóa</button>
              </div>
            </td>
          </tr>
        </tbody>
      </nz-table>

      <nz-modal [(nzVisible)]="isModalVisible" [nzTitle]="isEditing ? 'Sửa danh mục' : 'Thêm danh mục'" 
                (nzOnCancel)="handleCancel()" (nzOnOk)="handleOk()" [nzOkLoading]="isSaving">
        <ng-container *nzModalContent>
           <form nz-form nzLayout="vertical">
             <nz-form-item>
               <nz-form-label nzRequired>Tên danh mục</nz-form-label>
               <nz-form-control>
                 <input nz-input [(ngModel)]="currentCategory.name" name="name" />
               </nz-form-control>
             </nz-form-item>
             <nz-form-item>
               <nz-form-label>Mô tả</nz-form-label>
               <nz-form-control>
                 <textarea nz-input [(ngModel)]="currentCategory.description" name="description" rows="3"></textarea>
               </nz-form-control>
             </nz-form-item>
           </form>
        </ng-container>
      </nz-modal>
    </div>
  `,
  styles: [`
    .seller-categories-page { padding: 0; max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
    .header { background: #fff; padding: 24px 32px; border-radius: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 16px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; }
    .title-wrap h2 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; }
    .title-wrap p { margin: 6px 0 0; color: #64748b; font-size: 0.9rem; }
    ::ng-deep .ant-table-wrapper { background: #fff; border-radius: 20px; padding: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; }
    ::ng-deep .ant-table-thead > tr > th { background: #f8fafc !important; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; border-bottom: 1.5px solid #f1f5f9; }
    ::ng-deep .ant-table-tbody > tr > td { padding: 16px 16px; color: #1e293b; font-size: 0.875rem; border-bottom: 1px solid #f1f5f9; }
    .action-btns { display: flex; gap: 8px; }
    .seller-btn { padding: 6px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; }
    .seller-btn-primary { background: #4f46e5; color: white; }
    .seller-btn-primary:hover { background: #4338ca; }
    .seller-btn-default { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
    .seller-btn-default:hover { background: #e2e8f0; }
    .seller-btn-danger { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
    .seller-btn-danger:hover { background: #fecaca; }
  `]
})
export class SellerCategoriesComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  categories: any[] = [];
  loading = true;
  
  isModalVisible = false;
  isEditing = false;
  isSaving = false;
  currentCategory: any = { name: '', description: '' };

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading = true;
    this.categoryService.getSellerCategories().subscribe({
      next: (res) => {
        // Ensure data is always an array
        this.categories = Array.isArray(res) ? res : ((res as any)?.data || []);
        
        // Defer loading state change and UI update to avoid ExpressionChanged error
        setTimeout(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => { 
        this.message.error('Lỗi tải danh mục'); 
        setTimeout(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  openAddModal() {
    this.isEditing = false;
    this.currentCategory = { name: '', description: '' };
    this.isModalVisible = true;
  }

  editCategory(cat: any) {
    this.isEditing = true;
    this.currentCategory = { ...cat };
    this.isModalVisible = true;
  }

  handleCancel() {
    this.isModalVisible = false;
  }

  handleOk() {
    if (!this.currentCategory.name) {
      this.message.warning('Vui lòng nhập tên danh mục');
      return;
    }
    
    this.isSaving = true;
    const req = this.isEditing 
        ? this.categoryService.updateSellerCategory(this.currentCategory.id, this.currentCategory)
        : this.categoryService.createSellerCategory(this.currentCategory);

    req.subscribe({
      next: () => {
        this.message.success(this.isEditing ? 'Đã cập nhật' : 'Đã thêm mới');
        this.isSaving = false;
        this.isModalVisible = false;
        this.loadCategories();
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Có lỗi xảy ra');
        this.isSaving = false;
      }
    });
  }

  deleteCategory(id: number) {
    this.categoryService.deleteSellerCategory(id).subscribe({
      next: () => {
        this.message.success('Đã xóa danh mục');
        this.loadCategories();
      },
      error: () => this.message.error('Không thể xóa danh mục')
    });
  }
}
