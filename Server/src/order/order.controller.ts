import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Patch,
  Get,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderService } from './order.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrderStatus } from './enums/order-status.enum';

import { CheckoutDto } from './dto/checkout.dto';

@ApiTags('order')
@ApiBearerAuth('accessToken')
@Controller('order')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  checkout(@Req() req: any, @Body() checkoutDto: CheckoutDto) {
    return this.orderService.checkout(req.user.userId, checkoutDto);
  }

  @Get('history')
  getHistory(@Req() req: any) {
    return this.orderService.getHistory(req.user.userId);
  }

  @Get(':id')
  getOrderById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.getOrderById(id, req.user.userId);
  }

  @Get('all/admin')
  getAllOrders() {
    return this.orderService.getAllOrders();
  }

  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: OrderStatus) {
    return this.orderService.updateStatus(id, status);
  }
}
