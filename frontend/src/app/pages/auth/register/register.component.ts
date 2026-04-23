import { Component, OnInit, inject, NgZone } from '@angular/core';
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
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./auth.scss'],
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private zone = inject(NgZone);

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

  ngOnInit() {
  }
}
