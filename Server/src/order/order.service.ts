import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderItem, OrderStatus } from './entities/order.entity';
import { VoucherService } from '../voucher/voucher.service';
import { CartService } from '../cart/cart.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly voucherService: VoucherService,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
  ) {}

  async checkout(userId: number, voucherCode?: string) {
    // 1. Get cart items
    const cartItems = await this.cartService.getCartItems(userId);
    if (!cartItems.length) {
      throw new BadRequestException('Empty cart');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let discountAmount = 0;
      let appliedVoucherId: number | undefined = undefined;

      // 2. Validate voucher if any
      if (voucherCode) {
        const result = await this.voucherService.applyVoucher(userId, voucherCode);
        discountAmount = result.discount;
        appliedVoucherId = result.voucherId;
      }

      const rawTotal = cartItems.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0);
      const finalTotal = rawTotal - discountAmount;

      // 3. Create Order (Step 4: Lock voucher basically happens by associating it here)
      const order = this.orderRepository.create({
        userId,
        totalAmount: finalTotal,
        discountAmount: discountAmount,
        voucherId: appliedVoucherId,
        status: OrderStatus.PENDING,
      });

      const savedOrder = (await queryRunner.manager.save(order)) as Order;

      // Save order items
      const orderItems = cartItems.map(item => {
        return this.orderItemRepository.create({
          order: savedOrder,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        });
      });
      await queryRunner.manager.save(orderItems);

      // 4. Increment voucher usage (Step 4 lock logic)
      if (appliedVoucherId) {
        await this.voucherService.incrementUsage(appliedVoucherId);
      }

      // Clear cart
      await this.cartService.clearCart(userId);

      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async confirmPayment(orderId: number, success: boolean) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['voucher'],
    });

    if (!order) throw new BadRequestException('Order not found');

    if (success) {
      order.status = OrderStatus.PAID;
      await this.orderRepository.save(order);
    } else {
      // Step 5: Fail payment -> return voucher usage
      order.status = OrderStatus.CANCELLED;
      await this.orderRepository.save(order);

      if (order.voucherId) {
        // Decrease usage count if it was incremented during creation
        await this.dataSource.getRepository('Voucher').decrement(
          { id: order.voucherId },
          'usedCount',
          1,
        );
      }
    }
    return order;
  }
}
