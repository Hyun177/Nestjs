import { Component, OnInit, inject, NgZone, HostListener, PLATFORM_ID, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import * as THREE from 'three';
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
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./auth.scss'],
})
export class RegisterComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('auth3dContainer') auth3dContainer!: ElementRef;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private message = inject(NzMessageService);
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
          this.loading = false;
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

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (isPlatformBrowser(this.platformId)) {
      this.mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
      this.mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
    }
  }

  ngOnInit() {
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

    const pointLight1 = new THREE.PointLight(0x00f2ff, 5, 20); // Neon cyan
    pointLight1.position.set(2, 2, 2);
    this.scene.add(pointLight1);

    // Floating Glassy Shard
    const geometry = new THREE.IcosahedronGeometry(2, 0);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x00f2ff,
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
      this.shard.rotation.y += 0.012;
      this.shard.rotation.z += 0.008;
      
      this.shard.position.x = this.mouseX * 1;
      this.shard.position.y = -this.mouseY * 1;
      
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }
}
