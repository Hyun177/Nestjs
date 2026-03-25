import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { CategoryService } from '../../../core/services/category.service';
import { BrandService } from '../../../core/services/brand.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { NzDropDownModule } from 'ng-zorro-antd/dropdown';

@Component({
  imports: [RouterLink, CommonModule, FormsModule, NzIconModule, NzDropDownModule],
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private categoryService = inject(CategoryService);
  private brandService = inject(BrandService);
  currentUser$ = this.authService.currentUser$;
  cartCount$ = this.cartService.cartCount$;
  categories: any[] = [];
  brands: any[] = [];
  searchQuery = '';
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.categoryService.getCategories().subscribe((data: any[]) => {
      this.categories = data;
      this.cdr.detectChanges();
    });
    this.brandService.getBrands().subscribe((data: any[]) => {
      this.brands = data;
      this.cdr.detectChanges();
    });
  }

  logout() {
    this.authService.logout();
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/products'], { queryParams: { search: this.searchQuery } });
    }
  }
}
