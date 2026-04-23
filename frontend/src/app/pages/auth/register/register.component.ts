import { Component, OnInit, inject, NgZone, HostListener, PLATFORM_ID, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
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

    const accentLight = new THREE.PointLight(0x00f2ff, 80);
    accentLight.position.set(5, 5, 5);
    this.scene.add(accentLight);

    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;

    const geometry = new THREE.IcosahedronGeometry(3, 15);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x00f2ff,
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

    const initialPositions = (geometry.attributes['position'].array as Float32Array).slice();

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001;
      const posAttr = geometry.attributes['position'];
      for (let i = 0; i < posAttr.count; i++) {
        const x = initialPositions[i * 3];
        const y = initialPositions[i * 3 + 1];
        const z = initialPositions[i * 3 + 2];
        const noise = Math.sin(x * 1.5 + time) * 0.2 + Math.cos(y * 1.8 + time) * 0.2;
        posAttr.setZ(i, z + noise);
      }
      posAttr.needsUpdate = true;

      this.shard.rotation.y += 0.005;
      
      // Follow mouse only if not dragging (OrbitControls handles dragging)
      // We can just rely on OrbitControls for interaction now
      controls.update();

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }
}
