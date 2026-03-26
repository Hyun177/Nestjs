import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { VndCurrencyPipe } from '../../shared/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterLink, NzIconModule, VndCurrencyPipe],
  templateUrl: './order-success.component.html',
  styleUrls: ['./order-success.component.scss'],
})
export class OrderSuccessComponent implements OnInit {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  order: any = null;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const state = history.state;
      if (!state?.orderId) {
        this.router.navigate(['/home']);
        return;
      }
      this.order = state;
    }
  }
}
