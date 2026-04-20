import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NewsletterService } from '../../../core/services/newsletter.service';
import { RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [NzIconModule, FormsModule, RouterLink, CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent implements OnInit {
  currentYear: number = new Date().getFullYear();
  email = '';
  loading = false;
  subscribed = false;
  subscribedEmail: string | null = null;

  private newsletterService = inject(NewsletterService);
  private message = inject(NzMessageService);
  public authService = inject(AuthService);

  ngOnInit(): void {
    // If logged in, check subscription status to hide input.
    if (typeof localStorage === 'undefined') return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    this.newsletterService.me().subscribe({
      next: (res) => {
        this.subscribed = !!res?.subscribed;
        this.subscribedEmail = res?.email || null;
        if (this.subscribed && this.subscribedEmail) {
          this.email = this.subscribedEmail;
        }
      },
      error: () => {
        // ignore
      },
    });
  }

  subscribe() {
    const value = (this.email || '').trim();
    if (!value) {
      this.message.warning('Vui lòng nhập email');
      return;
    }
    this.executeSubscription(value);
  }

  subscribeWithUserEmail() {
    const user = this.authService.currentUserValue;
    if (!user || !user.email) {
      this.message.warning('Không tìm thấy email của bạn. Vui lòng đăng nhập lại.');
      return;
    }
    this.executeSubscription(user.email);
  }

  private executeSubscription(email: string) {
    this.loading = true;
    this.newsletterService.subscribe(email).subscribe({
      next: () => {
        this.loading = false;
        this.subscribed = true;
        this.subscribedEmail = email;
        this.email = email;
        this.message.success('Đã đăng ký nhận thông báo voucher thành công!');
      },
      error: (err) => {
        this.loading = false;
        this.message.error(err?.error?.message || 'Đăng ký thất bại');
      },
    });
  }
}
