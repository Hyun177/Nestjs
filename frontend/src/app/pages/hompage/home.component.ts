import { Component, OnInit, HostListener, inject, ChangeDetectorRef, PLATFORM_ID, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { ProductService, Product } from '../../core/services/product.service';
import { BrandService } from '../../core/services/brand.service';
import { CartService } from '../../core/services/cart.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { VndCurrencyPipe } from '../../shared/pipes/vnd-currency.pipe';
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
  @ViewChild('hero3dContainer') hero3dContainer!: ElementRef;

  private productService = inject(ProductService);
  private brandService = inject(BrandService);
  private cartService = inject(CartService);
  private favoriteService = inject(FavoriteService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  // Three.js Logic for REAL 3D Depth
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private floatingKnot!: THREE.Mesh;
  private animationId: number = 0;

  // Interactive 3D Parallax State
  mouseX = 0;
  mouseY = 0;
  scrollY = 0;
  private currentScroll = 0;
  private objectsDistance = 4;
  private sectionMeshes: THREE.Mesh[] = [];

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

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (isPlatformBrowser(this.platformId)) {
      this.mouseX = event.clientX / window.innerWidth - 0.5;
      this.mouseY = event.clientY / window.innerHeight - 0.5;

      // Update CSS variables for shine effect
      const xPercent = (event.clientX / window.innerWidth) * 100;
      const yPercent = (event.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', xPercent + '%');
      document.documentElement.style.setProperty('--mouse-y', yPercent + '%');
    }
  }

  @HostListener('window:scroll')
  onScroll() {
    if (isPlatformBrowser(this.platformId)) {
      this.scrollY = window.scrollY;
    }
  }

  ngOnInit() {
    this.fetchData();
    this.loadFavorites();
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initThreeJS();
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.animationId);
      if (this.renderer) this.renderer.dispose();
    }
  }

  private initThreeJS() {
    const parent = this.hero3dContainer.nativeElement as HTMLElement;
    if (!parent) return;

    this.scene = new THREE.Scene();

    // Camera Group for Parallax
    const cameraGroup = new THREE.Group();
    this.scene.add(cameraGroup);

    // Base camera
    this.camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.z = 6;
    cameraGroup.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearAlpha(0); // Transparent background
    parent.appendChild(this.renderer.domElement);

    // Lights
    const directionalLight = new THREE.DirectionalLight('#ffffff', 2);
    directionalLight.position.set(1, 1, 0);
    this.scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight('#404040', 2); // Soft white light
    this.scene.add(ambientLight);

    // Planet Textures (Using unpkg as reliable CORS CDN)
    const textureLoader = new THREE.TextureLoader();

    // Mesh 1: Earth (Hero Section)
    const earthTexture = textureLoader.load('https://unpkg.com/three@0.160.0/examples/textures/planets/earth_atmos_2048.jpg');
    const earthNormal = textureLoader.load('https://unpkg.com/three@0.160.0/examples/textures/planets/earth_normal_2048.jpg');
    const earthSpecular = textureLoader.load('https://unpkg.com/three@0.160.0/examples/textures/planets/earth_specular_2048.jpg');

    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      normalMap: earthNormal,
      specularMap: earthSpecular,
      specular: new THREE.Color('grey'),
      shininess: 50
    });
    const mesh1 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 64, 64), earthMaterial);

    // Mesh 2: Mars (Top Selling)
    const marsTexture = textureLoader.load('https://unpkg.com/three@0.160.0/examples/textures/planets/mars_1k_color.jpg');
    const marsNormal = textureLoader.load('https://unpkg.com/three@0.160.0/examples/textures/planets/mars_1k_normal.jpg');
    const marsMaterial = new THREE.MeshPhongMaterial({
      map: marsTexture,
      normalMap: marsNormal,
      shininess: 10
    });
    const mesh2 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 64, 64), marsMaterial);

    // Mesh 3: Moon (New Arrivals)
    const moonTexture = textureLoader.load('https://unpkg.com/three@0.160.0/examples/textures/planets/moon_1024.jpg');
    const moonMaterial = new THREE.MeshStandardMaterial({
      map: moonTexture,
      roughness: 0.8,
      metalness: 0.2
    });
    const mesh3 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 64, 64), moonMaterial);

    mesh1.position.x = 2;
    mesh2.position.x = -2.5;
    mesh3.position.x = 2;

    mesh1.position.y = -this.objectsDistance * 0;
    mesh2.position.y = -this.objectsDistance * 1;
    mesh3.position.y = -this.objectsDistance * 2;

    this.scene.add(mesh1, mesh2, mesh3);
    this.sectionMeshes = [mesh1, mesh2, mesh3];

    // Glow Effect (Atmosphere) for Earth
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f2ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.65, 64, 64), atmosphereMaterial);
    mesh1.add(atmosphere);

    // Asteroids / Particles
    const particlesCount = 800;
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = this.objectsDistance * 0.5 - Math.random() * this.objectsDistance * 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      // Random star colors (white, slight blue, slight yellow)
      const mix = Math.random();
      colors[i * 3] = mix > 0.8 ? 0.5 : 1; // R
      colors[i * 3 + 1] = mix > 0.8 ? 0.8 : 1; // G
      colors[i * 3 + 2] = 1; // B
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.05,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    this.scene.add(particles);

    // Handle Resize
    window.addEventListener('resize', () => {
      if (!this.camera || !this.renderer) return;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    let previousTime = 0;

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      const elapsedTime = Date.now() * 0.001;
      const deltaTime = elapsedTime - previousTime;
      previousTime = elapsedTime;

      // Animate camera (Scroll)
      this.camera.position.y = -this.scrollY / window.innerHeight * this.objectsDistance;

      // Parallax
      const parallaxX = this.mouseX * 0.5;
      const parallaxY = -this.mouseY * 0.5;
      cameraGroup.position.x += (parallaxX - cameraGroup.position.x) * 5 * deltaTime;
      cameraGroup.position.y += (parallaxY - cameraGroup.position.y) * 5 * deltaTime;

      // Animate meshes (Planets rotate slowly)
      for (const mesh of this.sectionMeshes) {
        mesh.rotation.y += deltaTime * 0.15; // Only rotate Y for planets
      }

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
