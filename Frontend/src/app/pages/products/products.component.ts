import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ShopService } from '../../core/services/shop.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../core/services/product.service';
import { VndCurrencyPipe } from '../../shared/pipes/vnd-currency.pipe';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { CategoryService } from '../../core/services/category.service';
import { BrandService } from '../../core/services/brand.service';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { FavoriteService } from '../../core/services/favorite.service';


@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink,
    NzPaginationModule, 
    NzSelectModule,
    NzInputModule,
    NzIconModule,
    NzButtonModule,
    NzSliderModule,
    VndCurrencyPipe
  ],
  providers: [NzMessageService],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private categoryService = inject(CategoryService);
  private brandService = inject(BrandService);
  private cdr = inject(ChangeDetectorRef);
  private message = inject(NzMessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private favoriteService = inject(FavoriteService);
  private shopService = inject(ShopService);


  products: Product[] = [];
  categories: any[] = [];
  brands: any[] = [];
  matchingShops: any[] = [];
  pageTitle = 'Tất cả sản phẩm';

  query = {
    page: 1,
    limit: 12,
    search: '',
    categoryId: null as number | null,
    brandId: null as number | null,
    sort: 'newest',
    price: [0, 100000000],
    color: '',
    size: '',
    onSale: false,
    newArrival: false
  };
  totalProducts = 0;

  availableColors: string[] = [];
  availableSizes: string[] = [];

  ngOnInit(): void {
    this.categoryService.getCategories().subscribe(res => {
      this.categories = res;
      this.updatePageTitle();
      this.cdr.markForCheck();
    });

    this.brandService.getBrands().subscribe(res => {
      this.brands = res;
      this.cdr.markForCheck();
    });

    this.route.queryParams.subscribe(params => {
      this.query.page = params['page'] ? Number(params['page']) : 1;
      this.query.search = params['search'] || '';
      this.query.categoryId = params['categoryId'] ? Number(params['categoryId']) : null;
      this.query.brandId = params['brandId'] ? Number(params['brandId']) : null;
      this.query.sort = params['sort'] || 'newest';
      this.query.color = params['color'] || '';
      this.query.size = params['size'] || '';
      this.query.onSale = params['onSale'] === 'true';
      this.query.newArrival = params['newArrival'] === 'true';
      if (params['minPrice']) this.query.price[0] = Number(params['minPrice']);
      if (params['maxPrice']) this.query.price[1] = Number(params['maxPrice']);

      this.updatePageTitle();
      this.loadProducts();
    });
  }

  extractFiltersFromProducts(products: Product[]) {
    const sizeSet = new Set<string>();
    const colorSet = new Set<string>();
    
    products.forEach(p => {
      if (p.attributes) {
        p.attributes.forEach((attr: any) => {
          const lowerName = attr.name.toLowerCase();
          if (lowerName.includes('color') || lowerName.includes('màu')) {
              attr.options.forEach((opt: string) => colorSet.add(opt));
          } else if (lowerName.includes('size') || lowerName.includes('dung lượng') || lowerName.includes('bộ nhớ') || lowerName.includes('kích thước')) {
              attr.options.forEach((opt: string) => sizeSet.add(opt));
          }
        });
      }
    });

    this.availableColors = Array.from(colorSet);
    this.availableSizes = Array.from(sizeSet);
  }

  getColorCode(colorName: string): string {
    const colorMap: { [key: string]: string } = {
      'đen': 'black',
      'trắng': 'white',
      'đỏ': 'red',
      'xanh dương': 'blue',
      'xanh lá': 'green',
      'vàng': 'gold',
      'tím': 'purple',
      'hồng': 'pink',
      'cam': 'orange',
      'xám': 'gray',
      'nâu': 'brown',
      'bạc': 'silver',
      'titan': '#8e8e8e',
      'natural': '#d9d0c1'
    };
    const lower = colorName.toLowerCase().trim();
    return colorMap[lower] || colorName;
  }
  updatePageTitle() {
    if (this.query.search) {
      this.pageTitle = `Kết quả tìm kiếm: "${this.query.search}"`;
    } else if (this.query.onSale) {
      this.pageTitle = 'Sản phẩm đang khuyến mãi';
    } else if (this.query.newArrival) {
      this.pageTitle = 'Sản phẩm mới về';
    } else if (this.query.categoryId && this.categories.length) {
      const activeCat = this.categories.find(c => c.id === this.query.categoryId);
      this.pageTitle = activeCat ? activeCat.name : 'Danh mục';
    } else {
      this.pageTitle = 'Tất cả sản phẩm';
    }
  }

  getDiscountPercent(product: Product): number {
    if (!product.originalPrice || product.originalPrice <= product.price) return 0;
    return Math.round(100 - (product.price * 100 / product.originalPrice));
  }

  buyNow(product: Product) {
    if (product.attributes && product.attributes.length > 0) {
      this.router.navigate(['/product', product.id]);
      return;
    }
    this.cartService.addToCart(product.id, 1).subscribe({
      next: () => {
        this.cartService.refreshCart();
        this.router.navigate(['/cart']);
      },
      error: () => this.message.warning('Vui lòng đăng nhập')
    });
  }

  getImageUrl(url?: string): string {
    if (!url) return 'assets/placeholder.png';
    if (url.startsWith('/uploads')) {
      return `http://localhost:3000${url}`;
    }
    return url;
  }

  loadProducts() {
    this.matchingShops = [];
    const raw: any = {
      page: this.query.page,
      limit: this.query.limit,
      search: this.query.search || undefined,
      categoryId: this.query.categoryId || undefined,
      brandId: this.query.brandId || undefined,
      sort: this.query.sort,
      color: this.query.color || undefined,
      size: this.query.size || undefined,
      onSale: this.query.onSale || undefined,
      newArrival: this.query.newArrival || undefined,
      minPrice: this.query.price[0] > 0 ? this.query.price[0] : undefined,
      maxPrice: this.query.price[1] < 100000000 ? this.query.price[1] : undefined,
    };

    if (this.query.search && this.query.page === 1) {
      this.shopService.searchShops(this.query.search).subscribe(shops => {
        this.matchingShops = shops;
        this.cdr.markForCheck();
      });
    }

    // Strip undefined/null – Angular HttpClient serializes undefined as the
    // literal string "undefined", which breaks backend numeric comparisons.
    const params = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== undefined && v !== null)
    );

    this.productService.getProductsPaginated(params).subscribe({
      next: (res) => {
        this.products = res.data;
        this.totalProducts = res.total;
        this.extractFiltersFromProducts(res.data);
        this.cdr.markForCheck();
      },
      error: () => {
        this.message.error('Lỗi khi tải dữ liệu sản phẩm');
      }
    });
  }


  onPageChange(page: number) {
    this.query.page = page;
    this.updateRoute();
  }

  onSortChange(value: string) {
    this.query.sort = value;
    this.query.page = 1;
    this.updateRoute();
  }
  
  onSearch() {
    this.query.page = 1;
    this.updateRoute();
  }

  onSelectCategory(id: number | null) {
    this.query.categoryId = id;
    this.query.page = 1;
    this.updateRoute();
  }

  onSelectBrand(id: number | null) {
    this.query.brandId = id;
    this.query.page = 1;
    this.updateRoute();
  }

  resetFilters() {
    this.query.categoryId = null; 
    this.query.brandId = null; 
    this.query.search = ''; 
    this.query.price = [0, 100000000];
    this.query.color = '';
    this.query.size = '';
    this.onSearch();
  }

  onSelectColor(color: string) {
    this.query.color = this.query.color === color ? '' : color;
    this.query.page = 1;
    this.updateRoute();
  }

  onSelectSize(size: string) {
    this.query.size = this.query.size === size ? '' : size;
    this.query.page = 1;
    this.updateRoute();
  }

  onPriceChange() {
    this.query.page = 1;
    this.updateRoute();
  }

  updateRoute() {
    const minPrice = this.query.price[0] > 0 ? this.query.price[0] : null;
    const maxPrice = this.query.price[1] < 100000000 ? this.query.price[1] : null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: this.query.page > 1 ? this.query.page : null,
        search: this.query.search || null,
        categoryId: this.query.categoryId || null,
        brandId: this.query.brandId || null,
        sort: this.query.sort !== 'newest' ? this.query.sort : null,
        color: this.query.color || null,
        size: this.query.size || null,
        onSale: this.query.onSale ? 'true' : null,
        newArrival: this.query.newArrival ? 'true' : null,
        minPrice,
        maxPrice
      },
      queryParamsHandling: 'merge'
    });
  }

  addToCart(product: Product) {
    if (product.attributes && product.attributes.length > 0) {
      this.message.info('Vui lòng chọn màu/dung lượng tại trang chi tiết');
      this.router.navigate(['/product', product.id]);
      return;
    }
    this.cartService.addToCart(product.id, 1).subscribe({
      next: () => this.message.success('Đã thêm vào giỏ hàng!'),
      error: () => this.message.error('Vui lòng đăng nhập')
    });
  }

  trackById(index: number, product: Product): number {
    return product.id;
  }

  toggleFavorite(product: Product) {
     this.favoriteService.toggleFavorite(product.id).subscribe({
       next: (res) => {
         this.message.success(res.message);
         this.cdr.markForCheck();
       },
       error: () => this.message.warning('Vui lòng đăng nhập để sử dụng chức năng yêu thích')
     });
  }

  isFavorite(productId: number): boolean {
    return this.favoriteService.isFavoriteLocal(productId);
  }
}
