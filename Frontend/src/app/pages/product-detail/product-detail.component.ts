import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService, Product } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { VndCurrencyPipe } from '../../shared/pipes/vnd-currency.pipe';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzButtonModule, NzRateModule, VndCurrencyPipe, RouterLink, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  providers: [NzMessageService]
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private message = inject(NzMessageService);

  product: Product | null = null;
  selectedImage: string = '';
  selectedAttributes: { [key: string]: string } = {};
  quantity: number = 1;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadProduct(+id);
      }
    });
  }

  loadProduct(id: number) {
    this.productService.getProductById(id).subscribe({
      next: (prod) => {
        this.product = prod;
        this.selectedImage = prod.image;
        
        // Default attributes
        if (prod.attributes) {
          prod.attributes.forEach(attr => {
            this.selectedAttributes[attr.name] = attr.options[0];
          });
        }
      },
      error: () => this.message.error('Không tìm thấy sản phẩm')
    });
  }

  selectAttribute(name: string, value: string) {
    this.selectedAttributes[name] = value;
  }

  updateQuantity(val: number) {
    this.quantity = Math.max(1, this.quantity + val);
  }

  addToCart() {
    if (!this.product) return;
    
    // Combine attributes for cart (size, color, etc.)
    const size = this.selectedAttributes['Size'] || this.selectedAttributes['Dung lượng'] || 'M';
    const color = this.selectedAttributes['Color'] || this.selectedAttributes['Màu sắc'] || 'Default';

    this.cartService.addToCart(this.product.id, this.quantity, size, color).subscribe({
      next: () => {
        this.message.success('Đã thêm sản phẩm vào giỏ hàng!');
      },
      error: () => {
        this.message.error('Bạn cần đăng nhập để mua hàng');
      }
    });
  }

  getDiscountPercent(product: Product): number {
    if (!product.originalPrice || product.originalPrice <= product.price) return 0;
    return Math.round(100 - (product.price * 100 / product.originalPrice));
  }

  isColorAttr(name: string): boolean {
    const n = name.toLowerCase();
    return n.includes('color') || n.includes('màu');
  }
}
