import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatus } from './enums/order-status.enum';
import { VoucherService } from '../voucher/voucher.service';
import { CartService } from '../cart/cart.service';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { UserAddress } from '../users/entities/user-address.entity';
import { CheckoutDto } from './dto/checkout.dto';
import { PaymentService } from '../payment/payment.service';
import { Voucher } from '../voucher/entities/voucher.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(UserAddress)
    private readonly userAddressRepository: Repository<UserAddress>,
    private readonly voucherService: VoucherService,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
    private readonly paymentService: PaymentService,
    private readonly mailService: MailService,
  ) {}

  async checkout(userId: number, checkoutDto: CheckoutDto) {
    const user = await this.orderRepository.manager.findOne(User, {
      where: { id: userId },
    });
    if (!user) throw new BadRequestException('Không tìm thấy người dùng');

    let shippingAddress = user.address;
    let shippingPhone = user.phone;

    if (checkoutDto.addressId) {
      const addr = await this.userAddressRepository.findOne({
        where: { id: checkoutDto.addressId, userId },
      });
      if (addr) {
        shippingAddress = `${addr.detail}, ${addr.wardName ? addr.wardName + ', ' : ''}${addr.provinceName}`;
        shippingPhone = addr.phone;
      }
    }

    if (!shippingAddress || !shippingPhone) {
      throw new BadRequestException(
        'Vui lòng thêm địa chỉ giao hàng trước khi đặt hàng',
      );
    }

    let cartItems = await this.cartService.getCartItems(userId);
    if (checkoutDto.itemIds && checkoutDto.itemIds.length > 0) {
      cartItems = cartItems.filter((item) =>
        checkoutDto.itemIds?.includes(item.id),
      );
    }
    if (!cartItems.length)
      throw new BadRequestException('Empty cart or no items selected');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let discountAmount = 0;
      let appliedVoucherId: number | undefined = undefined;

      if (checkoutDto.voucherCode) {
        const result = await this.voucherService.applyVoucher(
          userId,
          checkoutDto.voucherCode,
          checkoutDto.itemIds && checkoutDto.itemIds.length > 0
            ? checkoutDto.itemIds
            : cartItems.map((i) => i.id),
        );
        discountAmount = result.discount;
        appliedVoucherId = result.voucherId;
      }

      const rawTotal = cartItems.reduce(
        (acc, item) => acc + Number(item.price) * item.quantity,
        0,
      );
      const shippingFee = Number(checkoutDto.shippingFee ?? 0);
      const finalTotal = Math.max(0, rawTotal - discountAmount + shippingFee);

      const order = this.orderRepository.create({
        userId,
        totalAmount: finalTotal,
        discountAmount: discountAmount,
        shippingFee: shippingFee,
        voucherId: appliedVoucherId,
        paymentMethod: checkoutDto.paymentMethod,
        shippingAddress,
        shippingPhone,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await queryRunner.manager.save(order);

      const orderItems: OrderItem[] = [];
      const cartItemIdsToRemove: number[] = [];

      for (const item of cartItems) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
        });
        if (product) {
          if (item.variantSku && product.variants) {
            const variant = product.variants.find(
              (v: any) => v.sku === item.variantSku,
            );
            if (variant) variant.stock -= item.quantity;
          }
          product.stock -= item.quantity;
          await queryRunner.manager.save(product);
        }

        const orderItem = this.orderItemRepository.create({
          order: savedOrder,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
          variantSku: item.variantSku,
          shopId: product?.shopId || 0,
        });
        orderItems.push(orderItem);
        cartItemIdsToRemove.push(item.id);
      }
      await queryRunner.manager.save(orderItems);

      if (appliedVoucherId) {
        await queryRunner.manager.increment(
          Voucher,
          { id: appliedVoucherId },
          'usedCount',
          1,
        );
        // Mark user voucher as used
        await this.voucherService.markUserVoucherUsed(
          userId,
          checkoutDto.voucherCode!,
        );
      }

      await queryRunner.manager.delete(CartItem, {
        id: In(cartItemIdsToRemove),
      });
      await queryRunner.commitTransaction();

      const paymentResult = await this.paymentService.createPayment(savedOrder);
      if (user && user.email) {
        // Build rich email payload from real order data
        const orderForEmail = await this.orderRepository.findOne({
          where: { id: savedOrder.id },
          relations: ['items', 'items.product', 'voucher'],
        });
        const items =
          orderForEmail?.items?.map((it) => ({
            name: it.product?.name || `Product #${it.productId}`,
            quantity: it.quantity,
            price: Number(it.price),
            color: it.color || null,
            size: it.size || null,
          })) || [];

        this.mailService
          .sendOrderReceived(user.email, {
            id: savedOrder.id,
            paymentMethod: String(savedOrder.paymentMethod),
            shippingAddress: savedOrder.shippingAddress,
            shippingPhone: savedOrder.shippingPhone,
            items,
            shippingFee: Number(savedOrder.shippingFee || 0),
            discountAmount: Number(savedOrder.discountAmount || 0),
            totalAmount: Number(savedOrder.totalAmount || 0),
            voucherCode: orderForEmail?.voucher?.code || null,
            createdAt: savedOrder.createdAt,
          })
          .catch((e) => console.log('Email send failed:', e));
      }

      return {
        ...savedOrder,
        paymentUrl: paymentResult.url || null,
        message: paymentResult.message || 'Hệ thống đã nhận được đơn hàng.',
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getOrderById(orderId: number, userId: number): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { id: orderId, userId },
      relations: ['items', 'items.product', 'voucher'],
    });
  }

  async getHistory(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      relations: ['items', 'items.product', 'voucher'],
      order: { createdAt: 'DESC' },
    });
  }

  async sendOrderEmail(email: string, orderId: number) {
    // Backward compatible wrapper
    await this.mailService.sendOrderReceived(email, { id: orderId });
  }

  async getAllOrders(): Promise<Order[]> {
    return this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('product.shop', 'shop')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.voucher', 'voucher')
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  async getSellerOrders(sellerId: number): Promise<Order[]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.voucher', 'voucher')
      .where('product.userId = :sellerId', { sellerId })
      .orderBy('order.createdAt', 'DESC');

    return query.getMany();
  }

  async updateStatus(orderId: number, status: OrderStatus): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'user'],
    });
    if (!order) throw new BadRequestException('Order not found');

    const wasDelivered = order.status === OrderStatus.DELIVERED;

    if (
      order.status !== OrderStatus.DELIVERED &&
      status === OrderStatus.DELIVERED
    ) {
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.product) {
            item.product.soldCount =
              (item.product.soldCount || 0) + item.quantity;
            await this.dataSource.manager.save(item.product);
          }
        }
      }
    }

    order.status = status;
    const saved = await this.orderRepository.save(order);

    if (
      !wasDelivered &&
      status === OrderStatus.DELIVERED &&
      order.user &&
      order.user.email
    ) {
      this.mailService
        .sendOrderDelivered(order.user.email, {
          id: order.id,
          paymentMethod: String(order.paymentMethod),
          shippingAddress: order.shippingAddress,
          shippingPhone: order.shippingPhone,
          items:
            order.items?.map((it) => ({
              name: it.product?.name || `Product #${it.productId}`,
              quantity: it.quantity,
              price: Number(it.price),
              color: it.color || null,
              size: it.size || null,
            })) || [],
          shippingFee: Number(order.shippingFee || 0),
          discountAmount: Number(order.discountAmount || 0),
          totalAmount: Number(order.totalAmount || 0),
          createdAt: order.createdAt,
        })
        .catch((e) => console.log('Email send failed:', e));
    }

    return saved;
  }

  async cancelOrder(orderId: number, userId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
      relations: ['items', 'items.product'],
    });
    if (!order) throw new BadRequestException('Không tìm thấy đơn hàng');

    const allowedCancelStatuses = [
      OrderStatus.PENDING,
      OrderStatus.PAID,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
    ];
    if (!allowedCancelStatuses.includes(order.status)) {
      throw new BadRequestException('Không thể hủy đơn hàng ở giai đoạn này');
    }

    // Restore stock
    for (const item of order.items) {
      if (item.product) {
        if (item.variantSku && item.product.variants) {
          const variant = item.product.variants.find(
            (v: any) => v.sku === item.variantSku,
          );
          if (variant) {
            variant.stock += item.quantity;
          }
        }
        item.product.stock += item.quantity;
        await this.dataSource.manager.save(item.product);
      }
    }

    order.status = OrderStatus.CANCELLED;
    return this.orderRepository.save(order);
  }

  async deleteOrderAdmin(id: number): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new BadRequestException('Không tìm thấy đơn hàng');

    // Delete payments first if CASCADE is not yet in DB schema
    await this.paymentService.deleteByOrderId(id);

    await this.orderRepository.remove(order);
  }

  async updateOrderAdmin(
    id: number,
    data: {
      shippingAddress?: string;
      shippingPhone?: string;
      status?: OrderStatus;
    },
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new BadRequestException('Không tìm thấy đơn hàng');

    if (data.shippingAddress !== undefined)
      order.shippingAddress = data.shippingAddress;
    if (data.shippingPhone !== undefined)
      order.shippingPhone = data.shippingPhone;
    if (data.status !== undefined) order.status = data.status;
    return this.orderRepository.save(order);
  }
}
