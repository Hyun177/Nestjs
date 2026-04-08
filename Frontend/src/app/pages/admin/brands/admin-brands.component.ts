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
import { NzAvatarModule } from 'ng-zorro-antd/avatar';

import { BrandService } from '../../../core/services/brand.service';
import { CategoryService } from '../../../core/services/category.service';

@Component({
  selector: 'app-admin-brands',
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
    NzAvatarModule,
  ],
  templateUrl: './admin-brands.component.html',
  styleUrls: ['./admin-brands.component.scss'],
})
export class AdminBrandsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private brandService = inject(BrandService);
  private categoryService = inject(CategoryService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  isModalVisible = signal(false);
  isEditMode = signal(false);
  searchValue = signal('');
  pageIndex = signal(1);
  pageSize = signal(10);
  previewError = false;

  brands = signal<any[]>([]);

  brandForm = this.fb.group({
    id: [0],
    name: ['', [Validators.required]],
    description: [''],
    categoryId: [null as number | null, [Validators.required]],
    isPremium: [false],
    logo: ['']
  });

  categories = signal<any[]>([]);

  ngOnInit() {
    this.loadBrands();
    this.loadCategories();
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe(res => this.categories.set(res));
  }

  loadBrands() {
    this.loading.set(true);
    this.brandService.getAdminBrands().subscribe({
      next: (res) => {
        this.brands.set(res || []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false)
    });
  }

  approveBrand(id: number) {
    this.brandService.approveBrand(id).subscribe({
      next: () => {
        this.message.success('Đã duyệt thương hiệu');
        this.loadBrands();
      },
      error: (err) => this.message.error(err.error?.message || 'Không thể duyệt thương hiệu này')
    });
  }

  get filteredBrands() {
    const search = this.searchValue().toLowerCase();
    return this.brands().filter((b) =>
      b.name.toLowerCase().includes(search) ||
      (b.description || '').toLowerCase().includes(search)
    );
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.brandForm.reset({ id: 0, isPremium: false, logo: '' });
    this.isModalVisible.set(true);
  }

  openEditModal(brand: any) {
    this.isEditMode.set(true);
    this.brandForm.patchValue({
      id: brand.id,
      name: brand.name,
      description: brand.description,
      categoryId: brand.categoryId,
      isPremium: brand.isPremium || false,
      logo: brand.logo || ''
    });
    this.isModalVisible.set(true);
  }

  togglePremium(brand: any) {
    const newVal = !brand.isPremium;
    this.brandService.updateBrand(brand.id, { ...brand, isPremium: newVal }).subscribe({
      next: () => {
        brand.isPremium = newVal;
        this.message.success(newVal ? 'Đã kích hoạt Brand "Xịn"' : 'Đã bỏ Brand "Xịn"');
        this.cdr.detectChanges();
      },
      error: () => this.message.error('Lỗi khi cập nhật trạng thái')
    });
  }

  handleOk() {
    if (this.brandForm.invalid) return;

    const formValue = this.brandForm.getRawValue();
    const request = this.isEditMode()
      ? this.brandService.updateBrand(formValue.id!, formValue)
      : this.brandService.createBrand(formValue);

    request.subscribe({
      next: () => {
        this.message.success(this.isEditMode() ? 'Cập nhật thành công' : 'Thêm mới thành công');
        this.isModalVisible.set(false);
        this.loadBrands();
      },
      error: (err) => this.message.error(err.error?.message || 'Lỗi hệ thống')
    });
  }

  handleCancel() {
    this.isModalVisible.set(false);
  }

  deleteBrand(id: number) {
    this.brandService.deleteBrand(id).subscribe({
      next: () => {
        this.message.success('Đã xóa thương hiệu');
        this.loadBrands();
      },
      error: () => this.message.error('Không thể xóa thương hiệu này')
    });
  }

  onSearch(value: string) {
    this.searchValue.set(value);
    this.pageIndex.set(1);
  }
}

