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
import { NzIconModule } from 'ng-zorro-antd/icon';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UserService } from '../../../core/services/user.service';

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
    NzIconModule,
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
  private userService = inject(UserService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  isModalVisible = signal(false);
  isEditMode = signal(false);
  isSaving = signal(false);
  searchValue = signal('');
  shopFilter = signal<number | null>(null);
  pageIndex = signal(1);
  pageSize = signal(10);
  totalProducts = signal(0);

  products = signal<Product[]>([]);
  categories = signal<any[]>([]);
  brands = signal<any[]>([]);
  sellersList = signal<any[]>([]);

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
    this.loadSellers();
    
    // Initial load: no category filter
    this.brandService.getBrands().subscribe(brands => this.brands.set(brands));

    // Listen for category selection to fetch relevant brands in the modal
    this.productForm.get('categoryId')?.valueChanges.subscribe(catId => {
      if (catId) {
        this.brandService.getBrands(Number(catId)).subscribe(res => {
          this.brands.set(res);
          // Only reset brand if it's not present in the new brand list
          const currentBrandId = this.productForm.get('brandId')?.value;
          if (currentBrandId && !res.find((b: any) => b.id === currentBrandId)) {
            this.productForm.patchValue({ brandId: null }, { emitEvent: false });
          }
          this.cdr.detectChanges();
        });
      } else {
        // If no category selected, show all brands or clear? 
        // Showing all is better for initial state, but clearing is more logical for "child" relationship.
        // User says "danh mục là cha, thương hiệu là con", so if no father, no children list.
        this.brands.set([]);
        this.productForm.patchValue({ brandId: null }, { emitEvent: false });
        this.cdr.detectChanges();
      }
    });

    this.loadProducts();

    this.productForm.get('variants')?.valueChanges.subscribe(() => this.updateTotalStock());
  }

  loadSellers() {
    this.userService.getAllUsers().subscribe({
      next: (data: any) => {
        const sellers = (data || [])
          .filter((u: any) => u.shop || u.roles?.some((r: any) => r.name?.toLowerCase() === 'seller'))
          .map((u: any) => ({
            id: u.shop?.id || u.id,
            userId: u.id,
            displayName: u.shop?.name || (u.firstname ? `${u.firstname} ${u.lastname}`.trim() : u.email || 'Seller')
          }));
        
        this.sellersList.set([
          { id: 0, userId: 0, displayName: 'Sản phẩm Admin (Toàn sàn)' },
          ...sellers
        ]);
      }
    });
  }

  loadProducts() {
    this.loading.set(true);
    const params: any = { 
      page: this.pageIndex(), 
      limit: this.pageSize(), 
      search: this.searchValue(), 
      showAll: 'true' 
    };

    const sFilter = this.shopFilter();
    if (sFilter !== null && sFilter !== undefined) {
      if (sFilter === 0) {
        params.shopId = 0; // Admin fallback
      } else {
        const selected = this.sellersList().find(s => s.id === sFilter);
        if (selected) {
           params.sellerId = selected.userId;
        }
      }
    }

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

    // Reload form arrays — clear tất cả trước
    this.features.clear();
    this.specs.clear();
    this.attributes.clear();
    this.variants.clear();

    // Parse description thành 3 phần: intro / features / policy
    const desc = (product.description || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let intro = '';
    let parsedFeatures: string[] = [];
    let policy = '';

    // Tất cả các separator có thể có
    const FEAT_SEPS = ['\n\nĐẶC ĐIỂM NỔI BẬT:\n', '\nĐẶC ĐIỂM NỔI BẬT:\n', '\n\nĐẶC ĐIỂM NỔI BẬT:'];
    const POLICY_SEPS = ['\n\nTHÔNG TIN BẢO HÀNH:\n', '\n\nBẢO HÀNH:\n', '\nTHÔNG TIN BẢO HÀNH:\n', '\nBẢO HÀNH:\n', '\n\nTHÔNG TIN BẢO HÀNH:', '\n\nBẢO HÀNH:'];

    let featIdx = -1;
    let featSepLen = 0;
    for (const sep of FEAT_SEPS) {
      const idx = desc.indexOf(sep);
      if (idx !== -1) { featIdx = idx; featSepLen = sep.length; break; }
    }

    if (featIdx !== -1) {
      intro = desc.substring(0, featIdx).trim();
      const afterFeat = desc.substring(featIdx + featSepLen);

      let policyIdx = -1;
      let policyLen = 0;
      for (const sep of POLICY_SEPS) {
        const idx = afterFeat.indexOf(sep);
        if (idx !== -1) { policyIdx = idx; policyLen = sep.length; break; }
      }

      if (policyIdx !== -1) {
        const featStr = afterFeat.substring(0, policyIdx);
        policy = afterFeat.substring(policyIdx + policyLen).trim();
        parsedFeatures = featStr.split('\n')
          .map((f: string) => f.replace(/^[-•*]\s*/, '').trim())
          .filter((f: string) => f.length > 0);
      } else {
        parsedFeatures = afterFeat.split('\n')
          .map((f: string) => f.replace(/^[-•*]\s*/, '').trim())
          .filter((f: string) => f.length > 0);
      }
    } else {
      // Không có section headers — kiểm tra chỉ có policy không
      let policyIdx = -1;
      let policyLen = 0;
      for (const sep of POLICY_SEPS) {
        const idx = desc.indexOf(sep);
        if (idx !== -1) { policyIdx = idx; policyLen = sep.length; break; }
      }
      if (policyIdx !== -1) {
        intro = desc.substring(0, policyIdx).trim();
        policy = desc.substring(policyIdx + policyLen).trim();
      } else {
        intro = desc.trim();
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
      url: 'https://nestjs-zvmg.onrender.com' + product.image
    }] : [];
    this.galleryFileList = (product.images || []).map((img: string, i: number) => ({
      uid: `-img-${i}`, name: `gallery-${i}.png`, status: 'done',
      url: 'https://nestjs-zvmg.onrender.com' + img
    }));

    this.isModalVisible.set(true);
  }

  handleSubmit() {
    if (this.productForm.invalid) {
      this.message.warning('Vui lòng điền đầy đủ các trường bắt buộc!');
      return;
    }
    
    // Check if main image exists (either a new file or an existing URL)
    const hasMainImage = this.mainFileList.length > 0;
    if (!this.isEditMode() && !hasMainImage) {
      this.message.warning('Vui lòng chọn ảnh đại diện!');
      return;
    }

    this.isSaving.set(true);
    const val = this.productForm.getRawValue();
    const formData = new FormData();

    const featuresText = (val.descFeatures as string[])
      .filter(f => f.trim().length > 0).map(f => '- ' + f.trim()).join('\n');
    const fullDescription = `${val.descIntro}\n\nĐẶC ĐIỂM NỔI BẬT:\n${featuresText}\n\nTHÔNG TIN BẢO HÀNH:\n${val.descPolicy}`;

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

    // Handle single main image
    if (this.mainFileList.length > 0) {
      const file = this.mainFileList[0];
      const rawFile = file.originFileObj || (file as any);
      if (rawFile instanceof File || rawFile instanceof Blob) {
        formData.append('image', rawFile);
      } else if (file.url) {
        // Keep existing image URL by sending its relative path
        formData.append('image', file.url.replace('https://nestjs-zvmg.onrender.com', ''));
      }
    }

    // Handle gallery
    const existingImages: string[] = [];
    this.galleryFileList.forEach(f => {
      const rawFile = f.originFileObj || (f as any);
      if (rawFile instanceof File || rawFile instanceof Blob) {
        formData.append('images', rawFile);
      } else if (f.url) {
        existingImages.push(f.url.replace('https://nestjs-zvmg.onrender.com', ''));
      }
    });
    
    // Send existing images as a separate field to handle in backend if needed,
    // or we can append them to 'images' as strings if the backend parses them.
    if (existingImages.length > 0) {
      formData.append('existingImages', JSON.stringify(existingImages));
    }

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
        console.error('Submit Error:', err);
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

  onShopFilter(shopId: number | null) {
    this.shopFilter.set(shopId);
    this.pageIndex.set(1);
    this.loadProducts();
  }

  getStockStatus(stock: number) {
    if (stock > 20) return { color: 'success', label: 'Còn hàng' };
    if (stock > 0) return { color: 'warning', label: 'Sắp hết' };
    return { color: 'error', label: 'Hết hàng' };
  }

  getShopName(p: any) {
    if (p.shop?.name) return p.shop.name;
    if (p.userId) {
       const seller = this.sellersList().find(s => s.userId === p.userId);
       if (seller && seller.userId !== 0) return seller.displayName;
    }
    return 'Admin';
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
    const isImg = file.type?.startsWith('image/');
    if (!isImg) {
      this.message.error('Bạn chỉ có thể tải lên tệp hình ảnh!');
      return false;
    }
    const rawFile = file.originFileObj || (file as any);
    this.getBase64(rawFile).then(res => {
      file.thumbUrl = res as string;
      this.mainFileList = [file];
      this.cdr.detectChanges();
    });
    return false;
  };

  beforeUploadGallery = (file: NzUploadFile): boolean => {
    const isImg = file.type?.startsWith('image/');
    if (!isImg) {
      this.message.error('Bạn chỉ có thể tải lên tệp hình ảnh!');
      return false;
    }
    const rawFile = file.originFileObj || (file as any);
    this.getBase64(rawFile).then(res => {
      file.thumbUrl = res as string;
      this.galleryFileList = [...this.galleryFileList, file];
      this.cdr.detectChanges();
    });
    return false;
  };
}
