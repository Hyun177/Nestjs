import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, NgZone, HostListener, PLATFORM_ID, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  imports: [RouterLink, NzIconModule, ReactiveFormsModule, FormsModule, CommonModule],
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./auth.scss'],
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('auth3dContainer') auth3dContainer!: ElementRef;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  // 3D Interaction state
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private shard!: THREE.Mesh;
  private animationId: number = 0;
  
  mouseX = 0;
  mouseY = 0;
  
  loginForm: FormGroup;
  loading = false;
  passwordVisible = false;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false],
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.loading = true;
      this.cdr.detectChanges(); // Fix NG0100
      this.authService.login(this.loginForm.value).subscribe({
        next: () => {
          this.message.success('Đăng nhập thành công!');
          this.loading = false;
          this.cdr.detectChanges(); // Fix NG0100
          this.authService.currentUser$.subscribe((user) => {
            if (user?.roles.includes('admin')) {
              this.router.navigate(['/admin/products']);
            } else if (user?.roles.includes('manager')) {
              this.router.navigate(['/manager/home']);
            } else {
              this.router.navigate(['/home']);
            }
          });
        },
        error: (err) => {
          this.loading = false;
          this.cdr.detectChanges(); // Fix NG0100
          this.message.error(err.error?.message || 'Đăng nhập thất bại!');
        },
      });
    } else {
      Object.values(this.loginForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (isPlatformBrowser(this.platformId)) {
      this.mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
      this.mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
    }
  }

  ngOnInit() {
    this.initGoogleSignIn();
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
    const parent = this.auth3dContainer.nativeElement as HTMLElement;
    if (!parent) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, parent.clientWidth / parent.clientHeight, 0.1, 1000);
    this.camera.position.z = 8;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(parent.clientWidth, parent.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio); 
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    parent.appendChild(this.renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const envTexture = textureLoader.load('assets/images/sci-fi-auth.png');
    envTexture.mapping = THREE.EquirectangularReflectionMapping;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const accentLight = new THREE.PointLight(0x8b5cf6, 80);
    accentLight.position.set(5, 5, 5);
    this.scene.add(accentLight);

    const geometry = new THREE.IcosahedronGeometry(3, 15);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x4f46e5,
      metalness: 0.2,
      roughness: 0.01,
      transmission: 0.95,
      thickness: 3.0,
      ior: 1.5,
      clearcoat: 1.0,
      envMap: envTexture,
      envMapIntensity: 2.0
    });
    
    this.shard = new THREE.Mesh(geometry, material);
    this.scene.add(this.shard);

    // Initial position states for morphing
    const initialPositions = (geometry.attributes['position'].array as Float32Array).slice();

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001;
      
      // Morphing effect
      const posAttr = geometry.attributes['position'];
      for (let i = 0; i < posAttr.count; i++) {
        const x = initialPositions[i * 3];
        const y = initialPositions[i * 3 + 1];
        const z = initialPositions[i * 3 + 2];
        
        const noise = Math.sin(x * 1.2 + time) * 0.15 + Math.cos(y * 1.5 + time) * 0.15;
        posAttr.setZ(i, z + noise);
      }
      posAttr.needsUpdate = true;

      this.shard.rotation.y += 0.005;
      
      // Follow mouse
      this.shard.position.x += (this.mouseX * 2 - this.shard.position.x) * 0.1;
      this.shard.position.y += (-this.mouseY * 2 - this.shard.position.y) * 0.1;
      
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  setSlide(index: number) {
  }

  private initGoogleSignIn() {
    // Requires adding GOOGLE_CLIENT_ID to index.html or environment;
    // we keep it simple here: read from window global if present.
    const w = window as any;
    const clientId = w.GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) return;

    // Wait for Google Identity script to be available
    const waitForGsi = (tries = 0) => {
      if (w.google?.accounts?.id) return true;
      if (tries > 40) return false; // ~4s
      setTimeout(() => waitForGsi(tries + 1), 100);
      return false;
    };
    if (!waitForGsi()) return;

    w.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        const credential = response?.credential;
        if (!credential) return;
        this.loading = true;
        this.cdr.detectChanges();
        this.authService.loginWithGoogle(credential).subscribe({
          next: () => {
            this.message.success('Đăng nhập Google thành công!');
            this.loading = false;
            this.cdr.detectChanges();
            this.router.navigate(['/home']);
          },
          error: (err) => {
            this.loading = false;
            this.cdr.detectChanges();
            this.message.error(err.error?.message || 'Đăng nhập Google thất bại!');
          },
        });
      },
    });

    // Render the official button into a container if it exists
    setTimeout(() => {
      const el = document.getElementById('googleSignInButton');
      if (el) {
        w.google.accounts.id.renderButton(el, {
          theme: 'outline',
          size: 'large',
          width: 320,
        });
      }
    }, 0);
  }
}
