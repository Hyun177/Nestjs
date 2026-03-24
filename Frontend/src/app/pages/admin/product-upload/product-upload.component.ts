import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadModule, NzUploadFile } from 'ng-zorro-antd/upload';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { BrandService } from '../../../core/services/brand.service';
import { AuthService } from '../../../core/services/auth.service';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-product-upload',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzSelectModule,
    NzUploadModule,
    NzIconModule,
    RouterLink
  ],
  templateUrl: './product-upload.component.html',
  styleUrls: ['./product-upload.component.scss'],
})
export class ProductUploadComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private brandService = inject(BrandService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  productForm: FormGroup;
  categories: any[] = [];
  brands: any[] = [];
  fileList: NzUploadFile[] = [];
  loading = false;

  availableIcons = [
    'thunderbolt', 'safety', 'check-circle', 'info-circle', 'heart', 'star', 'tag', 'gift'
  ];

  constructor() {
    this.productForm = this.fb.group({
      name: ['', [Validators.required]],
      price: [0, [Validators.required]],
      originalPrice: [null],
      description: ['', [Validators.required]],
      categoryId: [null, [Validators.required]],
      brandId: [null, [Validators.required]],
      stock: [10, [Validators.required]],
      labels: [[]],
      promoNote: [''],
      specs: this.fb.array([]),
    });
  }

  get specs() {
    return this.productForm.get('specs') as FormArray;
  }

  addSpec() {
    const specGroup = this.fb.group({
      icon: ['info-circle'],
      text: ['', Validators.required]
    });
    this.specs.push(specGroup);
  }

  removeSpec(index: number) {
    this.specs.removeAt(index);
  }

  ngOnInit() {
    this.categoryService.getCategories().subscribe(res => this.categories = res);
    this.brandService.getBrands().subscribe(res => this.brands = res);
  }

  beforeUpload = (file: NzUploadFile): boolean => {
    this.fileList = [file];
    return false;
  };

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onSubmit() {
    if (this.productForm.valid && this.fileList.length > 0) {
      this.loading = true;
      const formData = new FormData();
      const val = this.productForm.value;

      formData.append('name', val.name);
      formData.append('price', val.price);
      if (val.originalPrice) formData.append('originalPrice', val.originalPrice);
      formData.append('description', val.description);
      formData.append('categoryId', val.categoryId);
      formData.append('brandId', val.brandId);
      formData.append('stock', val.stock);
      formData.append('promoNote', val.promoNote);
      
      // JSON strings for complex types
      formData.append('labels', JSON.stringify(val.labels));
      formData.append('specs', JSON.stringify(val.specs));

      if (this.fileList[0]) {
        formData.append('image', this.fileList[0] as any);
      }

      this.productService.createProduct(formData).subscribe({
        next: () => {
          this.message.success('Upload sản phẩm thành công!');
          this.productForm.reset();
          this.specs.clear();
          this.fileList = [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.message.error('Upload thất bại! Vui lòng kiểm tra lại quyền truy cập hoặc kết nối.');
          this.loading = false;
          this.cdr.detectChanges();
          console.error(err);
        }
      });
    } else {
      this.message.warning('Vui lòng nhập đầy đủ các trường bắt buộc và chọn ảnh!');
    }
  }
}
