import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-manager-home',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzButtonModule, RouterLink],
  template: `
    <div style="padding: 2rem; max-width: 1000px; margin: 0 auto;">
      <nz-card nzTitle="Manager Dashboard">
        <h3>Welcome, Manager</h3>
        <p>This is the manager dashboard. You can manage products here.</p>
        <div style="margin-top: 1rem; display: flex; gap: 1rem;">
          <button nz-button nzType="primary" routerLink="/admin/products">Manage Products</button>
          <button nz-button nzType="default" routerLink="/home">Back to Home</button>
        </div>
      </nz-card>
    </div>
  `
})
export class ManagerHomeComponent {}
