import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Order } from '../order/entities/order.entity';
import { Product } from '../product/entities/product.entity';
import { OrderStatus } from '../order/enums/order-status.enum';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getStats() {
    const userCount = await this.userRepository.count();
    const orderCount = await this.orderRepository.count();
    const productCount = await this.productRepository.count();

    // Sum total of all orders
    const orders = await this.orderRepository.find({
      where: { status: OrderStatus.DELIVERED },
    });
    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0,
    );

    // Calculate growth (mocked for now, but could be real compared to last month)
    return {
      userCount,
      orderCount,
      productCount,
      totalRevenue,
      trends: {
        users: 12, // +12%
        orders: 8,
        products: 5,
        revenue: 15,
      },
    };
  }

  async getRecentOrders(limit: number = 5) {
    return this.orderRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user'],
    });
  }

  async getTopProducts(limit: number = 5) {
    return this.productRepository.find({
      order: { soldCount: 'DESC' },
      take: limit,
      relations: ['category'],
    });
  }
}
