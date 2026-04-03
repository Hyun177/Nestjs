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

    // Fetch all delivered orders with items and products for revenue split
    const deliveredOrders = await this.orderRepository.find({
      where: { status: OrderStatus.DELIVERED },
      relations: ['items', 'items.product'],
    });

    let adminRevenue = 0;
    let sellerRevenue = 0;

    deliveredOrders.forEach((o) => {
      const orderTotal = Number(o.totalAmount || 0);
      
      // 1. Calculate the subtotal of all items in this order (before order-level discounts/shipping)
      const itemsSubtotal = (o.items || []).reduce((sum, item) => 
        sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);

      if (itemsSubtotal > 0) {
        // 2. Distribute the final orderTotal proportionally
        (o.items || []).forEach((item) => {
          const itemPriceTotal = Number(item.price || 0) * Number(item.quantity || 0);
          const sId = item.shopId ?? item.product?.shopId ?? 0;
          
          // Proportionally distribute shipping and vouchers: (itemSubtotal / itemsSubtotal) * orderTotal
          const distributedRevenue = (itemPriceTotal / itemsSubtotal) * orderTotal;
          
          if (sId === 0) {
            adminRevenue += distributedRevenue;
          } else {
            sellerRevenue += distributedRevenue;
          }
        });
      } else {
        // Fallback: If no items found but total exists, attribute to Admin (unlikely scenario)
        adminRevenue += orderTotal;
      }
    });

    const totalRevenue = adminRevenue + sellerRevenue;

    return {
      userCount,
      orderCount,
      productCount,
      totalRevenue,
      adminRevenue,
      sellerRevenue,
      trends: {
        users: 12,
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
