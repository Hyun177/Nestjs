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
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { BrandService } from '../../../core/services/brand.service';
import { AuthService } from '../../../core/services/auth.service';
import { RouterLink, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
    NzSwitchModule,
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
  
  mainFileList: NzUploadFile[] = [];
  galleryFileList: NzUploadFile[] = [];
  
  loading = false;

  availableIcons = [
    'thunderbolt', 'safety', 'check-circle', 'info-circle', 'heart', 'star', 'tag', 'gift'
  ];

  constructor() {
    this.productForm = this.fb.group({
      name: ['', [Validators.required]],
      price: [0, [Validators.required]],
      originalPrice: [null],
      description: [''],
      descIntro: ['', [Validators.required]],
      descFeatures: this.fb.array([this.fb.control('')]),
      descPolicy: [''],
      categoryId: [null, [Validators.required]],
      brandId: [null, [Validators.required]],
      stock: [0, [Validators.required]],
      labels: [[]],
      promoNote: [''],
      isArchived: [false],
      specs: this.fb.array([]),
      attributes: this.fb.array([]),
      variants: this.fb.array([]),
    });
  }

  get features() {
    return this.productForm.get('descFeatures') as FormArray;
  }

  addFeature() {
    this.features.push(this.fb.control(''));
  }

  removeFeature(index: number) {
    this.features.removeAt(index);
  }

  get specs() {
    return this.productForm.get('specs') as FormArray;
  }

  get attributes() {
    return this.productForm.get('attributes') as FormArray;
  }

  addAttribute() {
    this.attributes.push(this.fb.group({
      name: ['', Validators.required],
      options: ['', Validators.required] // We'll handle this as comma separated in UI
    }));
  }

  removeAttribute(index: number) {
    this.attributes.removeAt(index);
    this.generateVariants(); // Regenerate when attribute is removed
  }

  get variants() {
    return this.productForm.get('variants') as FormArray;
  }

  generateVariants() {
    const attrs = this.productForm.value.attributes;
    if (!attrs || attrs.length === 0) {
      this.variants.clear();
      return;
    }

    // Prepare arrays for Cartesian product
    const attrPool = attrs.map((a: any) => {
      const opts = a.options.split(',').map((o: string) => o.trim()).filter((o: string) => o.length > 0);
      return opts.map((o: string) => ({ name: a.name, val: o }));
    });

    if (attrPool.some((p: any) => p.length === 0)) return;

    // Cartesian product function
    const combinations = attrPool.reduce((a: any, b: any) => a.flatMap((d: any) => b.map((e: any) => [d, e].flat())));

    this.variants.clear();
    const currentPrice = this.productForm.value.price;

    combinations.forEach((c: any) => {
      const combo = Array.isArray(c) ? c : [c];
      const attrMap: { [key: string]: string } = {};
      const skuParts: string[] = [];

      combo.forEach((item: any) => {
        attrMap[item.name] = item.val;
        skuParts.push(item.val);
      });

      this.variants.push(this.fb.group({
        attributes: [attrMap],
        sku: [this.productForm.value.name + '-' + skuParts.join('-')],
        price: [currentPrice],
        stock: [10]
      }));
    });
    this.updateTotalStock();
  }

  updateTotalStock() {
    const total = this.variants.value.reduce((acc: number, curr: any) => acc + (curr.stock || 0), 0);
    if (this.variants.length > 0) {
      this.productForm.patchValue({ stock: total }, { emitEvent: false });
    }
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
    
    // Listen to attributes change to auto-generate variants (with debounce for Vietnamese Telex)
    this.productForm.get('attributes')?.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(() => {
        this.generateVariants();
    });

    // Listen to variant stock changes to update total stock
    this.productForm.get('variants')?.valueChanges.subscribe(() => {
        this.updateTotalStock();
    });
  }

  beforeUploadMain = (file: NzUploadFile): boolean => {
    this.mainFileList = [file];
    return false;
  };

  beforeUploadGallery = (file: NzUploadFile): boolean => {
    this.galleryFileList = [...this.galleryFileList, file];
    return false;
  };

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onSubmit() {
    if (this.loading) return; // Prevent double submission
    if (this.productForm.valid && this.mainFileList.length > 0) {
      this.loading = true;
      const formData = new FormData();
      const val = this.productForm.value;

      formData.append('name', val.name);
      formData.append('price', val.price);
      if (val.originalPrice) formData.append('originalPrice', val.originalPrice);
      
      const featuresText = val.descFeatures
        .filter((f: string) => f.trim().length > 0)
        .map((f: string) => '- ' + f.trim())
        .join('\n');
      
      const fullDescription = `${val.descIntro}\n\nĐẶC ĐIỂM NỔI BẬT:\n${featuresText}\n\nTHÔNG TIN BẢO HÀNH:\n${val.descPolicy}`;
      
      formData.append('description', fullDescription);
      formData.append('categoryId', val.categoryId);
      formData.append('brandId', val.brandId);
      formData.append('stock', val.stock);
      formData.append('promoNote', val.promoNote);
      formData.append('isArchived', String(val.isArchived ?? false));
      
      formData.append('labels', JSON.stringify(val.labels));
      formData.append('specs', JSON.stringify(val.specs));

      const attrData = val.attributes.map((a: any) => ({
        name: a.name,
        options: a.options.split(',').map((opt: string) => opt.trim()).filter((opt: string) => opt.length > 0)
      }));
      formData.append('attributes', JSON.stringify(attrData));
      formData.append('variants', JSON.stringify(val.variants));

      if (this.mainFileList[0]) {
        formData.append('image', this.mainFileList[0] as any);
      }
      this.galleryFileList.forEach(file => {
        formData.append('images', file as any);
      });

      this.productService.createProduct(formData).subscribe({
        next: () => {
          this.message.success('Upload sản phẩm thành công!');
          this.productForm.reset();
          this.specs.clear();
          this.mainFileList = [];
          this.galleryFileList = [];
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
      this.message.warning('Vui lòng nhập đầy đủ các trường bắt buộc và chọn ảnh đại diện!');
    }
  }
}
