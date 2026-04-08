import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Patch,
  Put,
  Delete,
  Get,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderService } from './order.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrderStatus } from './enums/order-status.enum';

import { CheckoutDto } from './dto/checkout.dto';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { Permission } from '../auth/permission/permissions.enum';
import type { RequestWithUser } from 'src/users/types/user-payload.type';

@ApiTags('order')
@ApiBearerAuth('accessToken')
@Controller('order')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  checkout(@Req() req: RequestWithUser, @Body() checkoutDto: CheckoutDto) {
    return this.orderService.checkout(req.user.userId, checkoutDto);
  }

  @Get('history')
  getHistory(@Req() req: RequestWithUser) {
    return this.orderService.getHistory(req.user.userId);
  }

  @Get('seller/all')
  getSellerOrders(@Req() req: RequestWithUser) {
    return this.orderService.getSellerOrders(req.user.userId);
  }

  @Get('seller/:sellerId')
  @Permissions(Permission.ORDER_READ)
  getSellerOrdersById(@Param('sellerId', ParseIntPipe) sellerId: number) {
    return this.orderService.getSellerOrders(sellerId);
  }

  @Get('all/admin')
  @Permissions(Permission.ORDER_READ)
  getAllOrders() {
    return this.orderService.getAllOrders();
  }

  @Get(':id')
  getOrderById(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.getOrderById(id, req.user.userId);
  }

  @Patch(':id/status')
  @Permissions(Permission.ORDER_UPDATE)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: OrderStatus,
  ) {
    return this.orderService.updateStatus(id, status);
  }

  @Patch(':id/cancel')
  @Permissions(Permission.ORDER_CANCEL)
  cancelOrder(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.cancelOrder(id, req.user.userId);
  }

  @Put(':id')
  @Permissions(Permission.ORDER_UPDATE)
  updateOrderAdmin(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.orderService.updateOrderAdmin(id, data);
  }

  @Delete(':id')
  @Permissions(Permission.ORDER_DELETE)
  deleteOrderAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.deleteOrderAdmin(id);
  }
}
