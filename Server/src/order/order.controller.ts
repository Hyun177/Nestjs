import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderService } from './order.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('order')
@ApiBearerAuth('accessToken')
@Controller('order')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  checkout(@Req() req: any, @Body('voucherCode') voucherCode?: string) {
    return this.orderService.checkout(req.user.userId, voucherCode);
  }

  @Patch(':id/payment')
  confirmPayment(@Param('id') id: string, @Body('success') success: boolean) {
    return this.orderService.confirmPayment(+id, success);
  }
}
