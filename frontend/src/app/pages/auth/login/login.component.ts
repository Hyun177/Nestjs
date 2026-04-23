import { Component, OnInit, OnDestroy, AfterViewInit, inject, ChangeDetectorRef, NgZone, ViewChild, ElementRef, HostListener, PLATFORM_ID } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  imports: [RouterLink, NzIconModule, ReactiveFormsModule, FormsModule, CommonModule],
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./auth.scss'],
})
export class LoginComponent implements OnInit, OnDestroy, AfterViewInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('auth3dContainer') auth3dContainer!: ElementRef;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private blobMesh!: THREE.Mesh;
  private animationId: number = 0;

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
  // Removed simple slider data 

  ngOnInit() {
    this.initGoogleSignIn();
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initThreeJS(), 100);
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.animationId);
      if (this.renderer) this.renderer.dispose();
      if (this.blobMesh) {
        this.blobMesh.geometry.dispose();
        (this.blobMesh.material as THREE.Material).dispose();
      }
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (this.camera && this.renderer && this.auth3dContainer) {
      const parent = this.auth3dContainer.nativeElement as HTMLElement;
      this.camera.aspect = parent.clientWidth / parent.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(parent.clientWidth, parent.clientHeight);
    }
  }

  private initThreeJS() {
    const parent = this.auth3dContainer.nativeElement as HTMLElement;
    if (!parent || parent.clientWidth === 0) return;

    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(parent.clientWidth, parent.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // Add canvas to parent directly instead of img
    const canvas = parent.querySelector('canvas');
    if (canvas) {
        parent.replaceChild(this.renderer.domElement, canvas);
        this.renderer.domElement.style.cssText = "position: absolute; inset: 0; width: 100% !important; height: 100% !important; z-index: 1; pointer-events: auto; cursor: grab;";
    } else {
        parent.appendChild(this.renderer.domElement);
    }

    this.camera = new THREE.PerspectiveCamera(45, parent.clientWidth / parent.clientHeight, 0.1, 1000);
    this.camera.position.z = 10;

    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(5, 5, 5);
    this.scene.add(dirLight);

    const accentLight = new THREE.PointLight(0x8b5cf6, 4, 20); // Purple/Indigo accent
    accentLight.position.set(-5, -5, 5);
    this.scene.add(accentLight);

    // Flowing Abstract Glass Sphere
    const geometry = new THREE.IcosahedronGeometry(3.5, 12);
    
    // Deform vertices slightly to make it an organic blob
    const pos = geometry.attributes['position'];
    for(let i = 0; i < pos.count; i++) {
        pos.setZ(i, pos.getZ(i) + Math.random() * 0.15 - 0.075);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x4f46e5, // Indigo
      metalness: 0.1,
      roughness: 0.15,
      transmission: 0.95,
      thickness: 2.0,
      ior: 1.5,
      clearcoat: 1.0,
    });
    this.blobMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.blobMesh);

    // Particles for atmosphere
    const particlesGeo = new THREE.BufferGeometry();
    const particlesCount = 500;
    const posArray = new Float32Array(particlesCount * 3);
    for(let i=0; i<particlesCount*3; i++) {
        posArray[i] = (Math.random() - 0.5) * 30;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
        size: 0.1, color: 0x8b5cf6, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    this.scene.add(particleSystem);

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      // Organic rotation
      this.blobMesh.rotation.x += 0.002;
      this.blobMesh.rotation.y += 0.001;
      particleSystem.rotation.y += 0.001;
      
      controls.update();
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
