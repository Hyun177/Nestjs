import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, ElementRef } from '@angular/core';
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
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { BrandService } from '../../../core/services/brand.service';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { AuthService } from '../../../core/services/auth.service';
import { ShopCategoryService } from '../../../core/services/shop-category.service';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-seller-product-upload',
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
    NzTooltipModule,
    NzModalModule,
    RouterLink
  ],
  templateUrl: './seller-product-upload.component.html',
  styleUrls: ['./seller-product-upload.component.scss'],
})
export class SellerProductUploadComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private brandService = inject(BrandService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);
  private modal = inject(NzModalService);

  productForm: FormGroup;
  adminCategories: any[] = [];
  sellerCategories: any[] = [];
  adminBrands: any[] = [];
  sellerBrands: any[] = [];
  shopCategories: any[] = [];

  @ViewChild('createCategoryTpl') createCategoryTpl!: TemplateRef<any>;
  @ViewChild('createBrandTpl') createBrandTpl!: TemplateRef<any>;
  @ViewChild('createShopCategoryTpl') createShopCategoryTpl!: TemplateRef<any>;
  @ViewChild('catInput') catInput!: ElementRef;
  @ViewChild('brandInput') brandInput!: ElementRef;
  @ViewChild('scInput') scInput!: ElementRef;
  
  mainFileList: NzUploadFile[] = [];
  galleryFileList: NzUploadFile[] = [];
  
  loading = false;
  isEditMode = false;
  productId: number | null = null;
  existingImage: string | null = null;
  existingGallery: string[] = [];

  availableIcons = [
    'thunderbolt', 'safety', 'check-circle', 'info-circle', 'heart', 'star', 'tag', 'gift'
  ];

  constructor() {
    this.productForm = this.fb.group({
      name: ['', [Validators.required]],
      price: [0, [Validators.required]],
      originalPrice: [null],
      descIntro: ['', [Validators.required]],
      descFeatures: this.fb.array([this.fb.control('')]),
      descPolicy: [''],
      categoryId: [null, [Validators.required]],
      brandId: [null, [Validators.required]],
      shopCategoryIds: [[]],
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
      options: ['', Validators.required]
    }));
  }

  removeAttribute(index: number) {
    this.attributes.removeAt(index);
    this.generateVariants();
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

    const attrPool = attrs.map((a: any) => {
      const opts = a.options.split(',').map((o: string) => o.trim()).filter((o: string) => o.length > 0);
      return opts.map((o: string) => ({ name: a.name, val: o }));
    });

    if (attrPool.some((p: any) => p.length === 0)) return;

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

  private shopCategoryService = inject(ShopCategoryService);

  ngOnInit() {
    // Fetch Categories
    forkJoin({
      admin: this.categoryService.getCategories(),
      seller: this.categoryService.getSellerCategories()
    }).subscribe({
      next: ({ admin, seller }) => {
        this.adminCategories = admin;
        this.sellerCategories = seller;
        this.cdr.detectChanges();
      }
    });
    
    // Listen for category selection to fetch relevant brands
    this.productForm.get('categoryId')?.valueChanges.subscribe(catId => {
      if (catId) {
        forkJoin({
          admin: this.brandService.getBrands(catId),
          seller: this.brandService.getSellerBrands(catId)
        }).subscribe({
          next: ({ admin, seller }) => {
            this.adminBrands = admin;
            this.sellerBrands = seller;
            
            // Only reset brand if it's not present in either brand list
            const currentBrandId = this.productForm.get('brandId')?.value;
            const allBrands = [...admin, ...seller];
            if (currentBrandId && !allBrands.find(b => b.id === currentBrandId)) {
              this.productForm.get('brandId')?.setValue(null);
            }
            this.cdr.detectChanges();
          }
        });
      } else {
        this.adminBrands = [];
        this.sellerBrands = [];
        this.productForm.get('brandId')?.setValue(null);
        this.cdr.detectChanges();
      }
    });

    this.shopCategoryService.findMyCategories().subscribe({
      next: (res) => this.shopCategories = res,
      error: () => this.shopCategories = []
    });
    
    this.route.queryParams.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.isEditMode = true;
        this.productId = +id;
        this.loadProductForEdit(this.productId);
      }
    });

    this.productForm.get('attributes')?.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(() => {
        this.generateVariants();
    });

    this.productForm.get('variants')?.valueChanges.subscribe(() => {
        this.updateTotalStock();
    });
  }

  loadProductForEdit(id: number) {
    this.loading = true;
    this.productService.getProductById(id).subscribe({
      next: (p: any) => {
        this.existingImage = p.image;
        this.existingGallery = p.images || [];

        // Parse description
        let descIntro = '', descFeatures: string[] = [], descPolicy = '';
        if (p.description) {
          const parts = p.description.split('\n\n');
          descIntro = parts[0] || '';
          const featuresPart = parts.find((pt: string) => pt.includes('ĐẶC ĐIỂM NỔI BẬT:'));
          if (featuresPart) {
            descFeatures = featuresPart.replace('ĐẶC ĐIỂM NỔI BẬT:\n', '').split('\n').map((f: string) => f.replace('- ', '').trim());
          }
          const policyPart = parts.find((pt: string) => pt.includes('THÔNG TIN BẢO HÀNH:'));
          if (policyPart) {
            descPolicy = policyPart.replace('THÔNG TIN BẢO HÀNH:\n', '').trim();
          }
        }

        this.productForm.patchValue({
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice,
          descIntro,
          descPolicy,
          categoryId: p.categoryId,
          brandId: p.brandId,
          stock: p.stock,
          promoNote: p.promoNote,
          isArchived: p.isArchived,
          shopCategoryIds: p.shopCategories?.map((sc: any) => sc.id) || [],
          labels: p.labels || []
        });

        // Patch FormArrays
        if (descFeatures.length > 0) {
          this.features.clear();
          descFeatures.forEach(f => this.features.push(this.fb.control(f)));
        }

        if (p.specs && p.specs.length > 0) {
          this.specs.clear();
          p.specs.forEach((s: any) => this.specs.push(this.fb.group({ icon: [s.icon], text: [s.text] })));
        }

        if (p.attributes && p.attributes.length > 0) {
          this.attributes.clear();
          p.attributes.forEach((a: any) => {
            this.attributes.push(this.fb.group({
               name: [a.name, Validators.required],
               options: [a.options.join(','), Validators.required]
            }));
          });
        }

        if (p.variants && p.variants.length > 0) {
          this.variants.clear();
          p.variants.forEach((v: any) => {
            this.variants.push(this.fb.group({
              attributes: [v.attributes],
              sku: [v.sku],
              price: [v.price],
              stock: [v.stock]
            }));
          });
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.message.error('Không thể tải thông tin sản phẩm');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  beforeUploadMain = (file: NzUploadFile): boolean => {
    this.mainFileList = [file];
    this.existingImage = null; // Clear existing if new selected
    return false;
  };

  beforeUploadGallery = (file: NzUploadFile): boolean => {
    this.galleryFileList = [...this.galleryFileList, file];
    return false;
  };

  removeExistingGallery(index: number) {
    this.existingGallery.splice(index, 1);
  }

  onSubmit() {
    if (this.loading) return;
    if (this.productForm.valid && (this.mainFileList.length > 0 || this.existingImage)) {
      this.loading = true;
      const formData = new FormData();
      const val = this.productForm.value;

      formData.append('name', val.name);
      formData.append('price', val.price);
      if (val.originalPrice) formData.append('originalPrice', val.originalPrice);
      
      const featuresText = val.descFeatures
        .filter((f: string) => f && f.trim().length > 0)
        .map((f: string) => '- ' + f.trim())
        .join('\n');
      
      const fullDescription = `${val.descIntro}\n\nĐẶC ĐIỂM NỔI BẬT:\n${featuresText}\n\nTHÔNG TIN BẢO HÀNH:\n${val.descPolicy}`;
      
      formData.append('description', fullDescription);
      formData.append('categoryId', val.categoryId);
      formData.append('brandId', val.brandId);
      formData.append('stock', val.stock);
      formData.append('promoNote', val.promoNote);
      formData.append('isArchived', String(val.isArchived ?? false));
      
      formData.append('shopCategoryIds', JSON.stringify(val.shopCategoryIds));
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
      } else if (this.existingImage) {
        formData.append('image', this.existingImage); // Send back existing path if no new file
      }

      this.galleryFileList.forEach(file => {
        formData.append('images', file as any);
      });
      if (this.isEditMode) {
        formData.append('existingImages', JSON.stringify(this.existingGallery));
      }

      const request$ = this.isEditMode && this.productId
        ? this.productService.updateProduct(this.productId, formData)
        : this.productService.createProduct(formData);

      request$.subscribe({
        next: () => {
          this.message.success(this.isEditMode ? 'Cập nhật sản phẩm thành công!' : 'Upload sản phẩm thành công!');
          this.productForm.reset();
          this.router.navigate(['/seller/products']);
          this.loading = false;
        },
        error: (err) => {
          this.message.error(this.isEditMode ? 'Cập nhật thất bại!' : 'Upload thất bại!');
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.message.warning('Vui lòng nhập đầy đủ các trường bắt buộc và chọn ảnh đại diện!');
    }
  }

  getFullUrl(path: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `http://localhost:3000${path.startsWith('/') ? '' : '/'}${path}`;
  }

  // --- Creation Methods ---

  openCreateCategoryModal() {
    const modal = this.modal.create({
      nzTitle: 'Tạo danh mục mới của tôi',
      nzContent: this.createCategoryTpl,
      nzOnOk: () => {
        const val = this.catInput.nativeElement.value;
        if (!val?.trim()) {
          this.message.warning('Vui lòng nhập tên danh mục');
          return false;
        }
        return new Promise((resolve) => {
          this.categoryService.createSellerCategory({ name: val }).subscribe({
            next: (res) => {
              this.message.success('Đã tạo danh mục thành công!');
              this.refreshCategories(res.id);
              resolve(true);
            },
            error: () => {
              this.message.error('Lỗi khi tạo danh mục');
              resolve(false);
            }
          });
        });
      }
    });
  }

  openCreateBrandModal() {
    const currentCatId = this.productForm.get('categoryId')?.value;
    if (!currentCatId) {
      this.message.warning('Vui lòng chọn danh mục chính trước khi tạo thương hiệu!');
      return;
    }

    const modal = this.modal.create({
      nzTitle: 'Tạo thương hiệu mới của tôi',
      nzContent: this.createBrandTpl,
      nzOnOk: () => {
        const val = this.brandInput.nativeElement.value;
        if (!val?.trim()) {
          this.message.warning('Vui lòng nhập tên thương hiệu');
          return false;
        }
        return new Promise((resolve) => {
          this.brandService.createSellerBrand({ name: val, categoryId: currentCatId }).subscribe({
            next: (res) => {
              this.message.success('Đã tạo thương hiệu thành công!');
              this.refreshBrands(currentCatId, res.id);
              resolve(true);
            },
            error: () => {
              this.message.error('Lỗi khi tạo thương hiệu');
              resolve(false);
            }
          });
        });
      }
    });
  }

  openCreateShopCategoryModal() {
    const modal = this.modal.create({
      nzTitle: 'Tạo danh mục riêng cho shop',
      nzContent: this.createShopCategoryTpl,
      nzOnOk: () => {
        const val = this.scInput.nativeElement.value;
        if (!val?.trim()) {
          this.message.warning('Vui lòng nhập tên danh mục shop');
          return false;
        }
        return new Promise((resolve) => {
          this.shopCategoryService.create({ name: val }).subscribe({
            next: (res) => {
              this.message.success('Đã tạo danh mục riêng thành công!');
              this.refreshShopCategories(res.id);
              resolve(true);
            },
            error: () => {
              this.message.error('Lỗi khi tạo danh mục shop');
              resolve(false);
            }
          });
        });
      }
    });
  }

  private refreshCategories(newId?: number) {
    this.categoryService.getSellerCategories().subscribe(res => {
      this.sellerCategories = res;
      if (newId) this.productForm.get('categoryId')?.setValue(newId);
      this.cdr.detectChanges();
    });
  }

  private refreshBrands(catId: number, newId?: number) {
    this.brandService.getSellerBrands(catId).subscribe(res => {
      this.sellerBrands = res;
      if (newId) this.productForm.get('brandId')?.setValue(newId);
      this.cdr.detectChanges();
    });
  }

  private refreshShopCategories(newId?: number) {
    this.shopCategoryService.findMyCategories().subscribe(res => {
      this.shopCategories = res;
      if (newId) {
        const current = this.productForm.get('shopCategoryIds')?.value || [];
        this.productForm.get('shopCategoryIds')?.setValue([...current, newId]);
      }
      this.cdr.detectChanges();
    });
  }
}
