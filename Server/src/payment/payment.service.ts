import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { Order } from '../order/entities/order.entity';
import { OrderStatus } from '../order/enums/order-status.enum';
import { OrderItem } from '../order/entities/order-item.entity';
import { Product } from '../product/entities/product.entity';
import {
  VNPay,
  ignoreLogger,
  HashAlgorithm,
  ProductCode,
  VnpLocale,
  ReturnQueryFromVNPay,
} from 'vnpay';

@Injectable()
export class PaymentService {
  private readonly vnpayClient: VNPay;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {
    this.vnpayClient = new VNPay({
      tmnCode: '9YTBK030',
      secureSecret: 'FMG2B2UFAYCP3CK46CT1VB3E34LFMHL4',
      vnpayHost: 'https://sandbox.vnpayment.vn',
      testMode: true,
      hashAlgorithm: HashAlgorithm.SHA512,
      enableLog: false,
      loggerFn: ignoreLogger,
    });
  }

  async createPayment(order: Order): Promise<any> {
    let payment = await this.paymentRepo.findOne({
      where: { orderId: order.id },
    });
    if (payment && payment.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Order already paid.');
    }

    if (!payment) {
      payment = this.paymentRepo.create({
        orderId: order.id,
        amount: Number(order.totalAmount),
        paymentMethod: order.paymentMethod,
        status: PaymentStatus.PENDING,
      });
      await this.paymentRepo.save(payment);
    }

    if (order.paymentMethod === PaymentMethod.VNPAY) {
      return this.generateVnpayUrl(order, '12.34.56.78');
    }

    return { message: 'Order created with current method.', order };
  }

  private generateVnpayUrl(order: Order, ipAddr: string): { url: string } {
    const amount = Math.round(Number(order.totalAmount));

    const paymentUrl = this.vnpayClient.buildPaymentUrl({
      vnp_Amount: amount,
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: order.id.toString(),
      vnp_OrderInfo: `Thanh toan don hang ${order.id}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: 'http://127.0.0.1:3000/api/payments/vnpay-callback',
      vnp_Locale: VnpLocale.VN,
    });

    return { url: paymentUrl };
  }

  /**
   * Restore product stock when an order is cancelled or payment fails.
   * Increments stock of each product/variant back to what it was before.
   */
  private async restoreStock(orderId: number): Promise<void> {
    const items = await this.orderItemRepo.find({ where: { orderId } });
    for (const item of items) {
      const product = await this.productRepo.findOne({
        where: { id: item.productId },
      });
      if (!product) continue;

      // Restore main stock
      product.stock += item.quantity;

      // Restore variant stock if applicable
      if (item.variantSku && product.variants) {
        const variant = product.variants.find(
          (v: any) => v.sku === item.variantSku,
        );
        if (variant) {
          variant.stock += item.quantity;
        }
      }

      await this.productRepo.save(product);
    }
  }

  async handleVnpayCallback(vnpParams: ReturnQueryFromVNPay): Promise<any> {
    const responseCode = vnpParams['vnp_ResponseCode'];
    const orderId = Number(vnpParams['vnp_TxnRef']);

    // Step 1: Verify signature using the vnpay library
    // The library's verifyReturnUrl returns isSuccess=true ONLY when signature is
    // valid AND responseCode==='00'. For cancelled payments (responseCode='24'),
    // isSuccess will be false but signature may still be valid.
    // We use a try/catch to differentiate between invalid signatures (throws) and
    // valid-but-not-successful payments (returns {isSuccess: false}).
    try {
      this.vnpayClient.verifyReturnUrl(vnpParams);
    } catch {
      throw new BadRequestException('Invalid checksum');
    }

    // Step 2: Load order & payment record
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');

    const payment = await this.paymentRepo.findOne({ where: { orderId } });

    // Step 3: Handle based on response code
    if (responseCode === '00') {
      // ✅ Payment SUCCESS
      order.status = OrderStatus.CONFIRMED;
      await this.orderRepo.save(order);

      if (payment) {
        payment.status = PaymentStatus.SUCCESS;
        const transactionNo = vnpParams['vnp_TransactionNo'];
        payment.transactionId =
          transactionNo !== undefined ? String(transactionNo) : undefined;
        payment.paymentData = vnpParams;
        await this.paymentRepo.save(payment);
      }
      return { success: true, message: 'Thanh toán thành công' };
    } else {
      // ❌ Payment CANCELLED (code=24) or FAILED (any other code)
      // Only update if order is still in PENDING state (not already confirmed)
      if (order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.CANCELLED;
        await this.orderRepo.save(order);

        // Restore product stock since the order is being cancelled
        await this.restoreStock(orderId);

        if (payment) {
          payment.status = PaymentStatus.FAILED;
          payment.paymentData = vnpParams;
          await this.paymentRepo.save(payment);
        }
      }

      const isCancelled = responseCode === '24';
      return {
        success: false,
        message: isCancelled ? 'Bạn đã hủy thanh toán' : 'Thanh toán thất bại',
        responseCode,
      };
    }
  }

  async deleteByOrderId(orderId: number): Promise<void> {
    await this.paymentRepo.delete({ orderId: orderId });
  }
}
