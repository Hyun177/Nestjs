import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { CategoryService } from '../../../core/services/category.service';
import { BrandService } from '../../../core/services/brand.service';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { NzDropDownModule } from 'ng-zorro-antd/dropdown';

@Component({
  imports: [RouterLink, CommonModule, NzIconModule, NzDropDownModule],
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

  ngOnInit() {
    this.categoryService.getCategories().subscribe((data) => (this.categories = data));
    this.brandService.getBrands().subscribe((data) => (this.brands = data));
  }

  logout() {
    this.authService.logout();
  }
}
