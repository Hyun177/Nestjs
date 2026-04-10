import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { FormsModule } from '@angular/forms';
import { ContactService, ContactRequest } from '../../core/services/contact.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTagModule } from 'ng-zorro-antd/tag';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, RouterLink, NzIconModule, NzBreadCrumbModule, FormsModule, NzTagModule],
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss']
})
export class SupportComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private contactService = inject(ContactService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  currentPage: string = 'about';
  showHistory: boolean = false;
  
  contactForm: ContactRequest = {
    name: '',
    email: '',
    subject: 'Yêu cầu hỗ trợ',
    message: ''
  };
  
  isSubmitting = false;
  myRequests: ContactRequest[] = [];
  isLoggedIn = false;

  menuItems = [
    { id: 'about', label: 'Về Softbee', icon: 'info-circle' },
    { id: 'features', label: 'Tính năng', icon: 'star' },
    { id: 'works', label: 'Cách hoạt động', icon: 'deployment-unit' },
    { id: 'career', label: 'Tuyển dụng', icon: 'team' },
    { id: 'contact', label: 'Liên hệ / Hỗ trợ', icon: 'phone' },
    { id: 'faq', label: 'Hỏi đáp (FAQ)', icon: 'question-circle' },
    { id: 'terms', label: 'Điều khoản dịch vụ', icon: 'file-text' },
    { id: 'privacy', label: 'Chính sách bảo mật', icon: 'lock' },
    { id: 'shipping', label: 'Chính sách vận chuyển', icon: 'car' },
    { id: 'account-info', label: 'Quản lý tài khoản', icon: 'user' },
    { id: 'deliveries', label: 'Quản lý giao hàng', icon: 'car' },
    { id: 'orders-info', label: 'Tra cứu đơn hàng', icon: 'solution' },
    { id: 'payments-info', label: 'Phương thức thanh toán', icon: 'credit-card' },
  ];

  ngOnInit() {
    this.checkLogin();
    this.route.url.subscribe(url => {
      const path = url[0]?.path;
      if (path && this.menuItems.some(item => item.id === path)) {
        this.currentPage = path;
        if (path === 'contact' && this.isLoggedIn) {
          this.loadMyRequests();
        }
      } else {
        // Fallback to about if path doesn't match
        this.currentPage = 'about';
      }
      this.cdr.detectChanges();
    });
  }

  checkLogin() {
    if (typeof window !== 'undefined') {
      this.isLoggedIn = !!localStorage.getItem('accessToken');
    }
  }

  loadMyRequests() {
    this.contactService.getMyRequests().subscribe({
      next: (res) => {
        this.myRequests = res;
      },
      error: () => console.error('Failed to load history')
    });
  }

  sendContact() {
    if (!this.contactForm.name || !this.contactForm.email || !this.contactForm.message) {
      this.message.warning('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    this.isSubmitting = true;
    this.contactService.submitRequest(this.contactForm).subscribe({
      next: () => {
        this.message.success('Cảm ơn bạn! Yêu cầu hỗ trợ đã được gửi thành công.');
        this.contactForm = {
          name: '',
          email: '',
          subject: 'Yêu cầu hỗ trợ',
          message: ''
        };
        this.isSubmitting = false;
        if (this.isLoggedIn) {
          this.loadMyRequests();
        }
      },
      error: () => {
        this.message.error('Gửi yêu cầu thất bại. Vui lòng thử lại sau!');
        this.isSubmitting = false;
      }
    });
  }
}
