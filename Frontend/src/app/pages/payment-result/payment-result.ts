import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzResultModule } from 'ng-zorro-antd/result';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule, NzResultModule, NzButtonModule, RouterLink, NzIconModule],
  templateUrl: './payment-result.html',
  styleUrl: './payment-result.css'
})
export class PaymentResultComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  status: 'success' | 'error' | 'info' = 'info';
  title = 'Đang xử lý thanh toán...';
  subTitle = 'Vui lòng đợi trong giây lát.';

  ngOnInit() {
    // Determine result from the route URL segments (works in SSR + browser)
    const urlPath = this.route.snapshot.url.map(s => s.path).join('/');

    const checkPath = (path: string) => {
      if (path.includes('payment-success')) {
        this.status = 'success';
        this.title = 'Thanh toán thành công!';
        this.subTitle = 'Đơn hàng của bạn đã được thanh toán và đang được xử lý.';
      } else if (path.includes('payment-failed')) {
        this.status = 'error';
        this.title = 'Thanh toán thất bại';
        this.subTitle = 'Giao dịch không thành công. Vui lòng kiểm tra lại tài khoản hoặc thử lại sau.';
      }
    };

    checkPath(urlPath);

    // Also check browser window.location in case route segments are empty
    if (isPlatformBrowser(this.platformId) && this.status === 'info') {
      checkPath(window.location.pathname);
    }

    this.route.queryParams.subscribe(() => {
      // Re-check if navigated with query params
      if (isPlatformBrowser(this.platformId)) {
        checkPath(window.location.pathname);
      }
    });
  }
}
