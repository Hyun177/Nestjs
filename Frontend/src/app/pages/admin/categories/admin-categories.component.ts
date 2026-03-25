import { Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';

import { CategoryService } from '../../../core/services/category.service';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzCardModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzSpaceModule,
    NzTagModule,
    NzSpinModule,
    NzEmptyModule,
    NzPopconfirmModule,
  ],
  templateUrl: './admin-categories.component.html',
  styleUrls: ['./admin-categories.component.scss'],
})
export class AdminCategoriesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  isModalVisible = signal(false);
  isEditMode = signal(false);
  searchValue = signal('');
  pageIndex = signal(1);
  pageSize = signal(10);

  categories = signal<any[]>([]);

  categoryForm = this.fb.group({
    id: [0],
    name: ['', [Validators.required]],
    description: [''],
  });

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading.set(true);
    this.categoryService.getCategories().subscribe({
      next: (res) => {
        this.categories.set(res || []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false)
    });
  }

  get filteredCategories() {
    const search = this.searchValue().toLowerCase();
    return this.categories().filter((c) =>
      c.name.toLowerCase().includes(search) ||
      (c.description || '').toLowerCase().includes(search)
    );
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.categoryForm.reset();
    this.isModalVisible.set(true);
  }

  openEditModal(category: any) {
    this.isEditMode.set(true);
    this.categoryForm.patchValue({
      id: category.id,
      name: category.name,
      description: category.description,
    });
    this.isModalVisible.set(true);
  }

  handleOk() {
    if (this.categoryForm.invalid) return;

    const formValue = this.categoryForm.getRawValue();
    const request = this.isEditMode()
      ? this.categoryService.updateCategory(formValue.id!, formValue)
      : this.categoryService.createCategory(formValue);

    request.subscribe({
      next: () => {
        this.message.success(this.isEditMode() ? 'Cập nhật thành công' : 'Thêm mới thành công');
        this.isModalVisible.set(false);
        this.loadCategories();
      },
      error: (err) => this.message.error(err.error?.message || 'Lỗi hệ thống')
    });
  }

  handleCancel() {
    this.isModalVisible.set(false);
  }

  deleteCategory(id: number) {
    this.categoryService.deleteCategory(id).subscribe({
      next: () => {
        this.message.success('Đã xóa danh mục');
        this.loadCategories();
      },
      error: () => this.message.error('Không thể xóa danh mục này')
    });
  }

  onSearch(value: string) {
    this.searchValue.set(value);
    this.pageIndex.set(1);
  }
}

