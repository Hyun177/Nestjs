import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../product/entities/product.entity';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  // Get or create cart for user
  async getOrCreateCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product', 'items.product.brand', 'items.product.category'],
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId });
      cart = await this.cartRepository.save(cart);
    }

    return cart;
  }

  // Get user's cart
  async getCart(userId: number): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product', 'items.product.brand', 'items.product.category'],
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return cart;
  }

  // Add item to cart
  async addItemToCart(
    userId: number,
    createCartItemDto: CreateCartItemDto,
  ): Promise<Cart> {
    const { productId, quantity, size, color } = createCartItemDto;

    // Verify product exists
    const product = await this.productRepository.findOneBy({ id: productId });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Determine variant and check stock
    let variantSku: string | undefined = undefined;
    let availableStock = product.stock;

    if (product.variants && product.variants.length > 0 && (size || color)) {
      // Value-based matching: check if sent values appear anywhere in variant attributes
      const variant = product.variants.find((v: any) => {
        const attrValues = Object.values(v.attributes).map((val: any) =>
          String(val).toLowerCase().trim()
        );
        const sMatch = !size || attrValues.includes(size.toLowerCase().trim());
        const cMatch = !color || attrValues.includes(color.toLowerCase().trim());
        return sMatch && cMatch;
      });

      if (!variant) {
        throw new BadRequestException(
          `Biến thể "${[color, size].filter(Boolean).join(' / ')}" không tồn tại hoặc đã hết hàng`
        );
      }
      variantSku = (variant as any).sku;
      availableStock = (variant as any).stock;
    }

    if (availableStock < quantity) {
      throw new BadRequestException('Not enough stock available for this variation');
    }

    // Get or create cart
    const cart = await this.getOrCreateCart(userId);

    // Check if item already exists in cart with SAME attributes
    let cartItem = await this.cartItemRepository.findOne({
      where: { 
        cartId: cart.id, 
        productId,
        size: size || null as any, 
        color: color || null as any 
      },
    });

    if (cartItem) {
      // Update existing item
      cartItem.quantity += quantity;
      await this.cartItemRepository.save(cartItem);
    } else {
      // Create new cart item
      cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId,
        quantity,
        price: product.price,
        size,
        color,
        variantSku,
      });
      await this.cartItemRepository.save(cartItem);
    }

    return this.getCart(userId);
  }

  // Update cart item quantity
  async updateCartItem(
    userId: number,
    itemId: number,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: itemId },
      relations: ['cart', 'product'],
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (cartItem.cart.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    const { quantity } = updateCartItemDto;

    if (!quantity || quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    // Check if product has enough stock
    if (cartItem.product.stock < quantity) {
      throw new BadRequestException('Not enough stock available');
    }

    cartItem.quantity = quantity;
    await this.cartItemRepository.save(cartItem);

    return this.getCart(userId);
  }

  // Remove item from cart
  async removeCartItem(userId: number, itemId: number): Promise<Cart> {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: itemId },
      relations: ['cart'],
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (cartItem.cart.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    await this.cartItemRepository.delete(itemId);

    return this.getCart(userId);
  }

  // Clear entire cart
  async clearCart(userId: number): Promise<void> {
    const cart = await this.getCart(userId);
    await this.cartItemRepository.delete({ cartId: cart.id });
  }

  // Get cart items
  async getCartItems(userId: number): Promise<CartItem[]> {
    const cart = await this.getCart(userId);
    return this.cartItemRepository.find({
      where: { cartId: cart.id },
      relations: ['product'],
    });
  }

  // Calculate cart total
  async getCartTotal(userId: number): Promise<number> {
    const items = await this.getCartItems(userId);
    return items.reduce(
      (total, item) => total + Number(item.price) * item.quantity,
      0,
    );
  }
}
