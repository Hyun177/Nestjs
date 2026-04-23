import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
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
export class LoginComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

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
  // Slider Data
  images = ['assets/images/auth-3d-bg.png'];
  currentIndex = 0;
  slideInterval: any;

  ngOnInit() {
    // Avoid NG0100 by updating state inside Angular zone and marking for check.
    this.slideInterval = setInterval(() => {
      this.zone.run(() => {
        this.nextSlide();
        this.cdr.detectChanges();
      });
    }, 5000);

    this.initGoogleSignIn();
  }

  ngOnDestroy() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  setSlide(index: number) {
    this.currentIndex = index;
  }

  nextSlide() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
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
