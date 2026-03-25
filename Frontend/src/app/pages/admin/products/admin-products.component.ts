import { Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzUploadModule, NzUploadFile } from 'ng-zorro-antd/upload';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ProductService, Product } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { BrandService } from '../../../core/services/brand.service';
import { VndCurrencyPipe } from '../../../shared/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzTableModule,
    NzButtonModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzTagModule,
    NzSpinModule,
    NzPopconfirmModule,
    NzUploadModule,
    NzSwitchModule,
    NzTooltipModule,
    NzDividerModule,
    NzSpaceModule,
    VndCurrencyPipe,
  ],
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.scss'],
})
export class AdminProductsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private brandService = inject(BrandService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  isModalVisible = signal(false);
  isEditMode = signal(false);
  isSaving = signal(false);
  searchValue = signal('');
  pageIndex = signal(1);
  pageSize = signal(10);
  totalProducts = signal(0);

  products = signal<Product[]>([]);
  categories = signal<any[]>([]);
  brands = signal<any[]>([]);

  availableIcons = [
    { label: 'Thông tin', value: 'info-circle' },
    { label: 'Chip / CPU', value: 'thunderbolt' },
    { label: 'RAM', value: 'database' },
    { label: 'Camera', value: 'camera' },
    { label: 'Pin', value: 'safety' },
    { label: 'Màn hình', value: 'mobile' },
    { label: 'Bảo hành', value: 'check-circle' },
    { label: 'Đặc điểm', value: 'star' },
    { label: 'Quà tặng', value: 'gift' },
  ];

  productForm = this.fb.group({
    id: [0],
    name: ['', [Validators.required]],
    price: [0, [Validators.required]],
    originalPrice: [null as number | null],
    stock: [0],
    categoryId: [null as number | null, [Validators.required]],
    brandId: [null as number | null, [Validators.required]],
    descIntro: ['', [Validators.required]],
    descFeatures: this.fb.array([this.fb.control('')]),
    descPolicy: [''],
    labels: [[] as string[]],
    promoNote: [''],
    isFeatured: [false],
    isArchived: [false],
    specs: this.fb.array([]),
    attributes: this.fb.array([]),
    variants: this.fb.array([]),
  });

  mainFileList: NzUploadFile[] = [];
  galleryFileList: NzUploadFile[] = [];

  get features() { return this.productForm.get('descFeatures') as FormArray; }
  get specs() { return this.productForm.get('specs') as FormArray; }
  get attributes() { return this.productForm.get('attributes') as FormArray; }
  get variants() { return this.productForm.get('variants') as FormArray; }

  ngOnInit() {
    this.categoryService.getCategories().subscribe(cats => this.categories.set(cats));
    this.brandService.getBrands().subscribe(brands => this.brands.set(brands));
    this.loadProducts();

    // Removed auto-generate variants on value change to fix "buggy add buttons"
    // and prevent resetting user's input while typing options.

    this.productForm.get('variants')?.valueChanges.subscribe(() => this.updateTotalStock());
  }

  loadProducts() {
    this.loading.set(true);
    const params = { page: this.pageIndex(), limit: this.pageSize(), search: this.searchValue() };
    this.productService.getProductsPaginated(params).subscribe({
      next: (res) => {
        this.products.set(res.data || []);
        this.totalProducts.set(res.total || 0);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false)
    });
  }

  // ---- FormArray Helpers ----
  addFeature() { this.features.push(this.fb.control('')); }
  removeFeature(i: number) { this.features.removeAt(i); }

  addSpec() {
    this.specs.push(this.fb.group({ icon: ['info-circle'], text: ['', Validators.required] }));
  }
  removeSpec(i: number) { this.specs.removeAt(i); }

  addAttribute() {
    this.attributes.push(this.fb.group({ name: ['', Validators.required], options: [''] }));
  }
  removeAttribute(i: number) {
    this.attributes.removeAt(i);
  }

  generateVariants() {
    const attrs = this.productForm.value.attributes as any[];
    if (!attrs || attrs.length === 0) { this.variants.clear(); return; }

    const attrPool = attrs.map((a: any) => {
      const opts = (a.options || '').split(',').map((o: string) => o.trim()).filter((o: string) => o.length > 0);
      return opts.map((o: string) => ({ name: a.name, val: o }));
    }).filter(pool => pool.length > 0);

    this.variants.clear();
    if (attrPool.length === 0) return;

    const combinations = attrPool.reduce((a: any[], b: any[]) =>
      a.flatMap((d: any) => b.map((e: any) => [d, e].flat()))
    );

    const currentPrice = this.productForm.value.price || 0;
    const productName = this.productForm.value.name || 'product';

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
        sku: [`${productName}-${skuParts.join('-')}`],
        price: [currentPrice],
        stock: [10],
      }));
    });
    this.updateTotalStock();
  }

  updateTotalStock() {
    if (this.variants.length > 0) {
      const total = this.variants.value.reduce((acc: number, v: any) => acc + (v.stock || 0), 0);
      this.productForm.patchValue({ stock: total }, { emitEvent: false });
    }
  }

  // ---- Modal Logic ----
  openAddModal() {
    this.isEditMode.set(false);
    this.productForm.reset({ isFeatured: false, isArchived: false, price: 0, stock: 0, labels: [] });
    this.features.clear(); this.features.push(this.fb.control(''));
    this.specs.clear();
    this.attributes.clear();
    this.variants.clear();
    this.mainFileList = [];
    this.galleryFileList = [];
    this.isModalVisible.set(true);
  }

  openEditModal(product: any) {
    this.isEditMode.set(true);

    // Reload form arrays
    this.features.clear();
    this.specs.clear();
    this.attributes.clear();
    this.variants.clear();
    let intro = product.description || '';
    let parsedFeatures: string[] = [];
    let policy = '';

    if (intro.includes('ĐẶC ĐIỂM NỔI BẬT:')) {
      const parts = intro.split('ĐẶC ĐIỂM NỔI BẬT:');
      intro = parts[0].trim();
      
      if (parts[1]) {
        if (parts[1].includes('BẢO HÀNH:')) {
          const subParts = parts[1].split('BẢO HÀNH:');
          const featureStr = subParts[0];
          policy = subParts[1].trim();
          parsedFeatures = featureStr.split('\n').map((f: string) => f.replace(/^- /, '').trim()).filter((f: string) => f.length > 0);
        } else {
          parsedFeatures = parts[1].split('\n').map((f: string) => f.replace(/^- /, '').trim()).filter((f: string) => f.length > 0);
        }
      }
    }

    if (parsedFeatures.length === 0) {
      this.features.push(this.fb.control(''));
    } else {
      parsedFeatures.forEach(f => this.features.push(this.fb.control(f)));
    }

    (product.specs || []).forEach((s: any) =>
      this.specs.push(this.fb.group({ icon: [s.icon || 'info-circle'], text: [s.text || ''] }))
    );
    (product.attributes || []).forEach((a: any) =>
      this.attributes.push(this.fb.group({
        name: [a.name],
        options: [(a.options || []).join(', ')]
      }))
    );
    (product.variants || []).forEach((v: any) =>
      this.variants.push(this.fb.group({
        attributes: [v.attributes || {}],
        sku: [v.sku || ''],
        price: [v.price || product.price],
        stock: [v.stock || 0],
      }))
    );

    this.productForm.patchValue({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      stock: product.stock,
      categoryId: product.categoryId,
      brandId: product.brandId,
      descIntro: intro,
      descPolicy: policy,
      labels: product.labels || [],
      promoNote: product.promoNote || '',
      isFeatured: !!product.isFeatured,
      isArchived: !!product.isArchived,
    });

    this.mainFileList = product.image ? [{
      uid: '-1', name: 'image.png', status: 'done',
      url: 'http://localhost:3000' + product.image
    }] : [];
    this.galleryFileList = (product.images || []).map((img: string, i: number) => ({
      uid: `-img-${i}`, name: `gallery-${i}.png`, status: 'done',
      url: 'http://localhost:3000' + img
    }));

    this.isModalVisible.set(true);
  }

  handleSubmit() {
    if (this.productForm.invalid) {
      this.message.warning('Vui lòng điền đầy đủ các trường bắt buộc!');
      return;
    }
    if (!this.isEditMode() && this.mainFileList.length === 0) {
      this.message.warning('Vui lòng chọn ảnh đại diện!');
      return;
    }

    this.isSaving.set(true);
    const val = this.productForm.getRawValue();
    const formData = new FormData();

    const featuresText = (val.descFeatures as string[])
      .filter(f => f.trim().length > 0).map(f => '- ' + f.trim()).join('\n');
    const fullDescription = `${val.descIntro}\n\nĐẶC ĐIỂM NỔI BẬT:\n${featuresText}\n\nBẢO HÀNH:\n${val.descPolicy}`;

    formData.append('name', val.name || '');
    formData.append('price', String(val.price));
    if (val.originalPrice) formData.append('originalPrice', String(val.originalPrice));
    formData.append('description', fullDescription);
    formData.append('categoryId', String(val.categoryId));
    formData.append('brandId', String(val.brandId));
    formData.append('stock', String(val.stock));
    formData.append('promoNote', val.promoNote || '');
    formData.append('isFeatured', String(val.isFeatured));
    formData.append('isArchived', String(val.isArchived));
    formData.append('labels', JSON.stringify(val.labels || []));
    formData.append('specs', JSON.stringify(val.specs || []));

    const attrData = (val.attributes as any[]).map((a: any) => ({
      name: a.name,
      options: (a.options || '').split(',').map((o: string) => o.trim()).filter((o: string) => o.length > 0),
    }));
    formData.append('attributes', JSON.stringify(attrData));
    formData.append('variants', JSON.stringify(val.variants || []));

    if (this.mainFileList[0]?.originFileObj) {
      formData.append('image', this.mainFileList[0].originFileObj as File);
    }
    this.galleryFileList.forEach(f => {
      if (f.originFileObj) formData.append('images', f.originFileObj as File);
    });

    const req = this.isEditMode()
      ? this.productService.updateProduct(val.id!, formData)
      : this.productService.createProduct(formData);

    req.subscribe({
      next: () => {
        this.message.success(this.isEditMode() ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!');
        this.isModalVisible.set(false);
        this.isSaving.set(false);
        this.loadProducts();
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Thao tác thất bại');
        this.isSaving.set(false);
      }
    });
  }

  handleCancel() { this.isModalVisible.set(false); }

  deleteProduct(id: number) {
    this.productService.deleteProduct(id).subscribe({
      next: () => { this.message.success('Đã xóa sản phẩm'); this.loadProducts(); },
      error: () => this.message.error('Không thể xóa sản phẩm')
    });
  }

  onSearch(value: string) {
    this.searchValue.set(value);
    this.pageIndex.set(1);
    this.loadProducts();
  }

  getStockStatus(stock: number) {
    if (stock > 20) return { color: 'success', label: 'Còn hàng' };
    if (stock > 0) return { color: 'warning', label: 'Sắp hết' };
    return { color: 'error', label: 'Hết hàng' };
  }

  getBase64(file: File): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  beforeUploadMain = (file: NzUploadFile): boolean => {
    this.getBase64(file as any as File).then(res => {
      file.thumbUrl = res as string;
      this.mainFileList = [file];
    });
    return false;
  };

  beforeUploadGallery = (file: NzUploadFile): boolean => {
    this.getBase64(file as any as File).then(res => {
      file.thumbUrl = res as string;
      this.galleryFileList = [...this.galleryFileList, file];
    });
    return false;
  };
}
