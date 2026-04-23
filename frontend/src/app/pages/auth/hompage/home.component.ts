import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { ProductService, Product } from '../../../core/services/product.service';
import { BrandService } from '../../../core/services/brand.service';
import { CartService } from '../../../core/services/cart.service';
import { FavoriteService } from '../../../core/services/favorite.service';
import { VndCurrencyPipe } from '../../../shared/pipes/vnd-currency.pipe';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, NzIconModule, NzButtonModule, VndCurrencyPipe, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [NzMessageService],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private productService = inject(ProductService);
  private brandService = inject(BrandService);
  private cartService = inject(CartService);
  private favoriteService = inject(FavoriteService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('hero3dContainer') hero3dContainer!: ElementRef;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private centerMesh!: THREE.Mesh;
  private particleSystem!: THREE.Points;
  private animationId: number = 0;
  private scrollY: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;

  products: Product[] = [];
  topSelling: Product[] = [];
  brands: any[] = [];
  premiumBrands: any[] = [];
  favoriteProductIds = new Set<number>();

  heroData = {
    title: 'FIND ELECTRONICS THAT MATCH YOUR NEEDS',
    subtitle:
      'Browse through our diverse range of high-quality electronic devices, designed to enhance your daily life and suit your personal preferences.',
    primaryCta: 'Shop Now',
  };

  stats = [
    { value: '200+', label: 'International Brands' },
    { value: '2,000+', label: 'High-Quality Products' },
    { value: '30,000+', label: 'Happy Customers' },
  ];

  categories = [
    {
      title: 'Casual',
      image: 'https://35express.org/wp-content/uploads/2025/02/nguon-goc-meme-doraemon.png.webp',
    },
    {
      title: 'Formal',
      image:
        'https://assets.myntassets.com/w_200,q_50,,dpr_3,fl_progressive,f_webp/assets/images/10777836/2019/10/16/d9ae4409-16a9-4f7e-83b1-2022d3bf353c1571215965504-MANQ-Men-Blazers-6291571215962908-1.jpg',
    },
    { title: 'Party', image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800' },
    { title: 'Gym', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800' },
  ];

  testimonials = [
    {
      name: 'Sarah M.',
      text: '"I\'m blown away by the quality and style of the clothes I received from Shop.co. From casual wear to elegant dresses, every piece I\'ve bought has exceeded my expectations."',
      verified: true,
    },
    {
      name: 'Alex K.',
      text: '"Finding clothes that align with my personal style used to be a challenge until I discovered Shop.co. The range of options they offer is truly remarkable."',
      verified: true,
    },
    {
      name: 'James L.',
      text: '"As someone who\'s always on the lookout for unique fashion pieces, I\'m thrilled to have stumbled upon Shop.co. The selection of clothes is not only diverse but also on-point with the latest trends."',
      verified: true,
    },
  ];

  get newArrivalProducts() {
    return this.products.slice(0, 8);
  }

  get hasMoreProducts() {
    return this.products.length > 8;
  }

  get topSellingProducts() {
    return this.topSelling.slice(0, 4);
  }

  ngOnInit() {
    this.fetchData();
    this.loadFavorites();
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Delay initialization slightly to let layout computing stabilize
      setTimeout(() => {
        this.initThreeJS();
      }, 100);
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.animationId);
      if (this.renderer) {
        this.renderer.dispose();
      }
      if (this.centerMesh) {
        this.centerMesh.geometry.dispose();
        (this.centerMesh.material as THREE.Material).dispose();
      }
      if (this.particleSystem) {
        this.particleSystem.geometry.dispose();
        (this.particleSystem.material as THREE.Material).dispose();
      }
    }
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (isPlatformBrowser(this.platformId)) {
      this.scrollY = window.scrollY;
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (isPlatformBrowser(this.platformId)) {
      this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (this.camera && this.renderer && this.hero3dContainer) {
      const parent = this.hero3dContainer.nativeElement as HTMLElement;
      this.camera.aspect = parent.clientWidth / parent.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(parent.clientWidth, parent.clientHeight);
    }
  }

  private initThreeJS() {
    const parent = this.hero3dContainer.nativeElement as HTMLElement;
    if (!parent || parent.clientWidth === 0) return;

    // Remove fallback image if WebGL initializes successfully
    const fallback = parent.querySelector('.fallback-img');
    if (fallback) fallback.remove();

    // Init Scene & Camera
    this.scene = new THREE.Scene();
    
    // Abstract dark background, but we make scene transparent to blend with CSS
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(parent.clientWidth, parent.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    parent.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, parent.clientWidth / parent.clientHeight, 0.1, 1000);
    this.camera.position.z = 15;

    // 1. Center Object: Abstract Wireframe TorusKnot
    const geometry = new THREE.TorusKnotGeometry(3, 1.2, 128, 32);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x4B6BFF, // Tech blue (matches oklch 250)
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    this.centerMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.centerMesh);

    // 2. Particle Geometry
    const particlesGeo = new THREE.BufferGeometry();
    const particlesCount = 800;
    const posArray = new Float32Array(particlesCount * 3);
    for(let i=0; i<particlesCount*3; i++) {
        // Spread particles around
        posArray[i] = (Math.random() - 0.5) * 40;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    // Abstract glowy tech blue dots
    const particlesMat = new THREE.PointsMaterial({
        size: 0.12,
        color: 0x8DA2FF,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    this.particleSystem = new THREE.Points(particlesGeo, particlesMat);
    this.scene.add(this.particleSystem);

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      // Base rotation
      this.centerMesh.rotation.x += 0.002;
      this.centerMesh.rotation.y += 0.003;
      
      this.particleSystem.rotation.y += 0.001;

      // Interactive scroll effect
      // When scrolling down, camera rotates/moves around the object
      const scrollProxy = this.scrollY * 0.001;
      this.camera.position.y = -scrollProxy * 2;
      // Object rotates faster on scroll
      this.centerMesh.rotation.z = scrollProxy * Math.PI;

      // Mouse Parallax effect
      const targetX = this.mouseX * 0.5;
      const targetY = this.mouseY * 0.5;
      
      this.particleSystem.rotation.x += 0.02 * (targetY - this.particleSystem.rotation.x);
      this.particleSystem.rotation.y += 0.02 * (targetX - this.particleSystem.rotation.y);
      this.camera.position.x += (this.mouseX * 1.5 - this.camera.position.x) * 0.05;

      this.camera.lookAt(this.scene.position);
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  fetchData() {
    this.productService.getProducts().subscribe({
      next: (res) => {
        this.products = res;
        this.cdr.markForCheck();
      },
      error: () => console.error('Failed to load products'),
    });

    this.productService.getTopSelling().subscribe({
      next: (res) => {
        this.topSelling = res;
        this.cdr.markForCheck();
      },
      error: () => console.error('Failed to load top selling'),
    });

    this.brandService.getBrands().subscribe({
      next: (res: any[]) => {
        this.brands = res;
        this.premiumBrands = res.filter(b => b.isPremium);

        // If no premium, use defaults for display
        if (this.premiumBrands.length === 0) {
          this.premiumBrands = [
            { name: 'Apple', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
            { name: 'Samsung', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg' },
            { name: 'Sony', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg' },
            { name: 'DELL', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Dell_logo_2016.svg' },
            { name: 'ASUS', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg' },
          ];
        }

        this.cdr.markForCheck();
      },
      error: () => {
        console.error('Failed to load brands');
        this.cdr.markForCheck();
      },
    });
  }

  navigateToBrand(brand: any) {
    if (!brand.id) return;
    // Navigate to products filtered by brand AND the category of that brand (per user request)
    this.router.navigate(['/products'], {
      queryParams: {
        brandId: brand.id,
        categoryId: brand.categoryId
      }
    });
  }

  loadFavorites() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    this.favoriteService.getFavorites().subscribe({
      next: (favs) => {
        this.favoriteProductIds = new Set(favs.map((f) => f.product.id));
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status === 401) {
          this.favoriteProductIds = new Set<number>();
          return;
        }
        console.error('Failed to fetch favorites', err);
      },
    });
  }

  toggleFavorite(product: Product) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      this.message.error('Vui lòng đăng nhập để yêu thích sản phẩm này!');
      this.router.navigate(['/login']);
      return;
    }

    this.favoriteService.toggleFavorite(product.id).subscribe({
      next: (res) => {
        if (res.status === 'added') {
          this.favoriteProductIds.add(product.id);
          this.message.success('Đã thêm vào yêu thích!');
        } else {
          this.favoriteProductIds.delete(product.id);
          this.message.info('Đã xóa khỏi yêu thích');
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.message.error('Vui lòng đăng nhập để yêu thích sản phẩm');
      },
    });
  }

  isFavorite(productId: number): boolean {
    return this.favoriteProductIds.has(productId);
  }

  addToCart(product: Product) {
    if (product.attributes && product.attributes.length > 0) {
      // Products with variants MUST be selected on detail page
      this.message.info('Vui lòng chọn Màu sắc/Dung lượng tại trang chi tiết');
      this.router.navigate(['/product', product.id]);
      return;
    }

    this.cartService.addToCart(product.id, 1).subscribe({
      next: () => {
        this.message.success('Đã thêm sản phẩm vào giỏ hàng!');
      },
      error: () => {
        this.message.error('Vui lòng đăng nhập để mua hàng');
      },
    });
  }

  buyNow(product: Product) {
    if (product.attributes && product.attributes.length > 0) {
      this.router.navigate(['/product', product.id]);
      return;
    }

    this.cartService.addToCart(product.id, 1).subscribe({
      next: () => {
        this.router.navigate(['/cart']);
      },
      error: () => {
        this.message.error('Vui lòng đăng nhập để tiếp tục');
      },
    });
  }

  getDiscountPercent(product: Product): number {
    if (!product.originalPrice || product.originalPrice <= product.price) return 0;
    return Math.round(100 - (product.price * 100) / product.originalPrice);
  }
}
