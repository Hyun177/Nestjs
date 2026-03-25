import { Component, signal, OnInit, ViewChild, TemplateRef, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { FavoriteService, FavoriteProduct } from '../../../core/services/favorite.service';

@Component({
  selector: 'app-admin-favorites',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzCardModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzRateModule,
    NzTagModule,
    NzEmptyModule,
    NzSpinModule,
    NzPopconfirmModule,
  ],
  templateUrl: './admin-favorites.component.html',
  styleUrls: ['./admin-favorites.component.scss'],
})
export class AdminFavoritesComponent implements OnInit {
  @ViewChild('totalTemplate') totalTemplate!: TemplateRef<any>;
  private favoriteService = inject(FavoriteService);

  loading = signal(false);
  searchValue = signal('');
  pageIndex = signal(1);
  pageSize = signal(10);

  // Reference to favoriteService signals
  favoriteProducts = this.favoriteService.favoriteProducts;
  filteredProducts = signal<FavoriteProduct[]>([]);

  ngOnInit() {
    this.loading.set(true);
    // Load favorites from service
    this.favoriteService.getFavorites().subscribe({
      next: (favorites: FavoriteProduct[]) => {
        this.loading.set(false);
        this.filterProducts();
      },
      error: (error: any) => {
        console.error('Failed to load favorites:', error);
        this.loading.set(false);
        // Fall back to local favorites
        this.filterProducts();
      },
    });
  }

  filterProducts() {
    const search = this.searchValue().toLowerCase();
    this.filteredProducts.set(
      this.favoriteProducts().filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          (p.brand?.name && p.brand.name.toLowerCase().includes(search)) ||
          (p.category?.name && p.category.name.toLowerCase().includes(search)),
      ),
    );
  }

  onSearch(value: string) {
    this.searchValue.set(value);
    this.pageIndex.set(1);
    this.filterProducts();
  }

  removeFavorite(id: number) {
    this.favoriteService.removeFavoriteLocal(id);
    this.filterProducts();
  }

  getStockStatus(stock: number): { color: string; label: string } {
    if (stock > 20) {
      return { color: 'success', label: `${stock} - Còn hàng` };
    } else if (stock > 5) {
      return { color: 'warning', label: `${stock} - Sắp hết` };
    } else if (stock > 0) {
      return { color: 'error', label: `${stock} - Rất hiếm` };
    }
    return { color: 'default', label: 'Hết hàng' };
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  }

  getPriceDiscount(original: number, current: number): number {
    return Math.round(((original - current) / original) * 100);
  }
}
