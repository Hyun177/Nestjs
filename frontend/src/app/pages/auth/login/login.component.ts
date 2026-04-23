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

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(parent.clientWidth, parent.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    parent.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x8b5cf6, 5, 20); // Neon purple
    pointLight1.position.set(2, 2, 2);
    this.scene.add(pointLight1);

    // Subtle floating Glass Prism
    const geometry = new THREE.OctahedronGeometry(2, 0);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x8b5cf6,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.9,
      thickness: 1.0,
      ior: 1.5,
      clearcoat: 1.0,
    });
    
    this.shard = new THREE.Mesh(geometry, material);
    this.scene.add(this.shard);

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.shard.rotation.y += 0.01;
      this.shard.rotation.x += 0.01;
      
      this.shard.position.x = this.mouseX * 1;
      this.shard.position.y = -this.mouseY * 1;
      
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
