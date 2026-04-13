import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import type { RequestWithUser } from '../common/types/request-with-user';
import { Cart } from './entities/cart.entity';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('accessToken')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  async getCart(@Req() req: RequestWithUser): Promise<Cart> {
    return await this.cartService.getOrCreateCart(req.user.userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  async addItemToCart(
    @Req() req: RequestWithUser,
    @Body() createCartItemDto: CreateCartItemDto,
  ): Promise<Cart> {
    return await this.cartService.addItemToCart(
      req.user.userId,
      createCartItemDto,
    );
  }

  @Get('items')
  @ApiOperation({ summary: 'Get cart items' })
  async getCartItems(@Req() req: RequestWithUser) {
    return await this.cartService.getCartItems(req.user.userId);
  }

  @Get('total')
  @ApiOperation({ summary: 'Get cart total price' })
  async getCartTotal(@Req() req: RequestWithUser) {
    const total = await this.cartService.getCartTotal(req.user.userId);
    return { total };
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateCartItem(
    @Req() req: RequestWithUser,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    return await this.cartService.updateCartItem(
      req.user.userId,
      itemId,
      updateCartItemDto,
    );
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeCartItem(
    @Req() req: RequestWithUser,
    @Param('itemId', ParseIntPipe) itemId: number,
  ): Promise<Cart> {
    return await this.cartService.removeCartItem(req.user.userId, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  async clearCart(@Req() req: RequestWithUser): Promise<{ message: string }> {
    await this.cartService.clearCart(req.user.userId);
    return { message: 'Cart cleared successfully' };
  }
}
