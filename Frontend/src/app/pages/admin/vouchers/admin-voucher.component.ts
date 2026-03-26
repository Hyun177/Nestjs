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
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

import { VoucherService } from '../../../core/services/voucher.service';
import { CategoryService } from '../../../core/services/category.service';
import { BrandService } from '../../../core/services/brand.service';
import { VndCurrencyPipe } from '../../../shared/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-admin-vouchers',
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
    NzDatePickerModule,
    NzInputNumberModule,
    NzSwitchModule,
    NzPopconfirmModule,
    NzEmptyModule,
    VndCurrencyPipe
  ],
  templateUrl: './admin-voucher.component.html',
  styleUrls: ['./admin-voucher.component.scss'],
})
export class AdminVoucherComponent implements OnInit {
  private fb = inject(FormBuilder);
  private voucherService = inject(VoucherService);
  private categoryService = inject(CategoryService);
  private brandService = inject(BrandService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  isModalVisible = signal(false);
  isEditMode = signal(false);
  searchValue = signal('');

  vouchers = signal<any[]>([]);
  categories = signal<any[]>([]);
  brands = signal<any[]>([]);

  voucherForm = this.fb.group({
    id: [0],
    code: ['', [Validators.required]],
    type: ['PERCENT', [Validators.required]],
    value: [0, [Validators.required, Validators.min(0)]],
    maxDiscountAmount: [null],
    minOrderAmount: [0, [Validators.required, Validators.min(0)]],
    usageLimit: [0, [Validators.required, Validators.min(0)]],
    userUsageLimit: [1, [Validators.required, Validators.min(1)]],
    startDate: [null as any, [Validators.required]],
    endDate: [null as any, [Validators.required]],
    isActive: [true],
    categoryIds: [[] as number[]],
    brandIds: [[] as number[]],
  });

  ngOnInit() {
    this.loadVouchers();
    this.loadMetadata();
  }

  loadVouchers() {
    this.loading.set(true);
    this.voucherService.getVouchers().subscribe({
      next: (res) => {
        this.vouchers.set(res || []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false)
    });
  }

  loadMetadata() {
    this.categoryService.getCategories().subscribe(res => this.categories.set(res || []));
    this.brandService.getBrands().subscribe(res => this.brands.set(res || []));
  }

  get filteredVouchers() {
    const search = this.searchValue().toLowerCase();
    return this.vouchers().filter((v) =>
      v.code.toLowerCase().includes(search)
    );
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.voucherForm.reset({
      id: 0,
      type: 'PERCENT',
      value: 0,
      minOrderAmount: 0,
      usageLimit: 0,
      userUsageLimit: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      categoryIds: [],
      brandIds: []
    });
    this.isModalVisible.set(true);
  }

  openEditModal(voucher: any) {
    this.isEditMode.set(true);
    this.voucherForm.patchValue({
      id: voucher.id,
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      maxDiscountAmount: voucher.maxDiscountAmount,
      minOrderAmount: voucher.minOrderAmount,
      usageLimit: voucher.usageLimit,
      userUsageLimit: voucher.userUsageLimit,
      startDate: new Date(voucher.startDate),
      endDate: new Date(voucher.endDate),
      isActive: voucher.isActive,
      categoryIds: voucher.applicableCategories?.map((c: any) => c.id) || [],
      brandIds: voucher.applicableBrands?.map((b: any) => b.id) || [],
    });
    this.isModalVisible.set(true);
  }

  handleOk() {
    if (this.voucherForm.invalid) {
      Object.values(this.voucherForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    const { id, ...data } = this.voucherForm.getRawValue();
    console.log('Sending data to update voucher:', data);
    this.loading.set(true);
    const request = this.isEditMode()
      ? this.voucherService.updateVoucher(id as any, data)
      : this.voucherService.createVoucher(data);

    request.subscribe({
      next: () => {
        this.message.success(this.isEditMode() ? 'Cập nhật thành công' : 'Thêm mới thành công');
        this.isModalVisible.set(false);
        this.loadVouchers();
      },
      error: (err) => {
        console.error('Full Update/Create Error:', err);
        const errorMsg = err.error?.message;
        const msg = Array.isArray(errorMsg) ? errorMsg.join(', ') : (errorMsg || 'Có lỗi xảy ra');
        this.message.error(msg);
        this.loading.set(false);
      },
    });
  }

  handleCancel() {
    this.isModalVisible.set(false);
  }

  deleteVoucher(id: number) {
    this.voucherService.deleteVoucher(id).subscribe({
      next: () => {
        this.message.success('Đã xóa voucher');
        this.loadVouchers();
      },
      error: () => this.message.error('Không thể xóa voucher này')
    });
  }

  onSearch(value: string) {
    this.searchValue.set(value);
  }
}
