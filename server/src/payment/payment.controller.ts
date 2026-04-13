import { Controller, Get, Query, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';
import type { Response } from 'express';
import type { ReturnQueryFromVNPay } from 'vnpay';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('vnpay-callback')
  async vnpayCallback(
    @Query() query: ReturnQueryFromVNPay,
    @Res() res: Response,
  ) {
    const result = await this.paymentService.handleVnpayCallback(query);

    // Redirect to frontend with status
    if (result.success) {
      return res.redirect('http://localhost:4200/payment-success'); // Match your Frontend URL
    } else {
      return res.redirect('http://localhost:4200/payment-failed'); // Match your Frontend URL
    }
  }
}
