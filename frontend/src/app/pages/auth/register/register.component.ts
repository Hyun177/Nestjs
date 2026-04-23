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
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./auth.scss'],
})
export class RegisterComponent implements OnInit, OnDestroy, AfterViewInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private platformId = inject(PLATFORM_ID);
  private zone = inject(NgZone);

  @ViewChild('auth3dContainer') auth3dContainer!: ElementRef;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private blobMesh!: THREE.Mesh;
  private animationId: number = 0;

  registerForm: FormGroup;
  passwordVisible = false;
  confirmPasswordVisible = false;
  loading = false;

  constructor() {
    this.registerForm = this.fb.group(
      {
        firstname: ['', [Validators.required]],
        lastname: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        agree: [false, [Validators.requiredTrue]],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.loading = true;
      const { firstname, lastname, email, password } = this.registerForm.value;
      this.authService.register({ firstname, lastname, email, password }).subscribe({
        next: (res) => {
          this.message.success('Đăng ký thành công!');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.loading = false;
          this.message.error(err.error?.message || 'Đăng ký thất bại!');
        },
      });
    } else {
      Object.values(this.registerForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  ngOnInit() {
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(5, 5, 5);
    this.scene.add(dirLight);

    const accentLight = new THREE.PointLight(0x8b5cf6, 4, 20); // Purple/Indigo accent
    accentLight.position.set(-5, -5, 5);
    this.scene.add(accentLight);

    const geometry = new THREE.IcosahedronGeometry(3.5, 12);
    
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

      this.blobMesh.rotation.x += 0.002;
      this.blobMesh.rotation.y += 0.001;
      particleSystem.rotation.y += 0.001;
      
      controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }
}
