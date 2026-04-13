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

    // Retrieve all sellers to robustly map revenue by userId if shopId is missing
    const users = await this.userRepository.find({ relations: ['roles'] });
    const sellerIds = users
      .filter((u) => u.roles?.some((r: any) => r.name === 'seller'))
      .map((u) => u.id);

    // Helper to calculate split revenue
    const getSplitRev = (orders: Order[]) => {
      let adminRev = 0;
      let sellerRev = 0;
      orders.forEach((o) => {
        const orderTotal = Number(o.totalAmount || 0);
        const itemsSubtotal = (o.items || []).reduce(
          (sum, item) =>
            sum + Number(item.price || 0) * Number(item.quantity || 0),
          0,
        );

        if (itemsSubtotal > 0) {
          (o.items || []).forEach((item) => {
            const itemPriceTotal =
              Number(item.price || 0) * Number(item.quantity || 0);
            let isSeller = false;
            if (item.shopId && item.shopId > 0) isSeller = true;
            else if (item.product?.shopId && item.product.shopId > 0)
              isSeller = true;
            else if (
              item.product?.userId &&
              sellerIds.includes(item.product.userId)
            )
              isSeller = true;

            const distributedRevenue =
              (itemPriceTotal / itemsSubtotal) * orderTotal;
            if (!isSeller) adminRev += distributedRevenue;
            else sellerRev += distributedRevenue;
          });
        } else {
          adminRev += orderTotal;
        }
      });
      return { adminRev, sellerRev, totalRev: adminRev + sellerRev };
    };

    const overallRev = getSplitRev(deliveredOrders);
    const adminRevenue = Math.round(overallRev.adminRev);
    const sellerRevenue = Math.round(overallRev.sellerRev);
    const totalRevenue = Math.round(overallRev.totalRev);

    // Calculate real trends based on current vs previous month
    const currentDate = new Date();
    const currentMonthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const lastMonthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1,
    );

    // Users trend (User entity lacks createdAt, defaulting to 0)
    const usersTrend = 0;

    // Orders trend
    const currentMonthOrders = await this.orderRepository.count({
      where: { createdAt: Between(currentMonthStart, currentDate) },
    });
    const lastMonthOrders = await this.orderRepository.count({
      where: { createdAt: Between(lastMonthStart, currentMonthStart) },
    });
    const ordersTrend =
      lastMonthOrders === 0
        ? currentMonthOrders > 0
          ? 100
          : 0
        : ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100;

    // Products trend
    const currentMonthProducts = await this.productRepository.count({
      where: { createdAt: Between(currentMonthStart, currentDate) },
    });
    const lastMonthProducts = await this.productRepository.count({
      where: { createdAt: Between(lastMonthStart, currentMonthStart) },
    });
    const productsTrend =
      lastMonthProducts === 0
        ? currentMonthProducts > 0
          ? 100
          : 0
        : ((currentMonthProducts - lastMonthProducts) / lastMonthProducts) *
          100;

    // Revenue trend (All delivered orders this month vs last month)
    const currentMonthDeliveredOrders = await this.orderRepository.find({
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: Between(currentMonthStart, currentDate),
      },
      relations: ['items', 'items.product'],
    });
    const lastMonthDeliveredOrders = await this.orderRepository.find({
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: Between(lastMonthStart, currentMonthStart),
      },
      relations: ['items', 'items.product'],
    });

    const currRev = getSplitRev(currentMonthDeliveredOrders);
    const lastRev = getSplitRev(lastMonthDeliveredOrders);

    const revenueTrend =
      lastRev.totalRev === 0
        ? currRev.totalRev > 0
          ? 100
          : 0
        : ((currRev.totalRev - lastRev.totalRev) / lastRev.totalRev) * 100;
    const adminRevenueTrend =
      lastRev.adminRev === 0
        ? currRev.adminRev > 0
          ? 100
          : 0
        : ((currRev.adminRev - lastRev.adminRev) / lastRev.adminRev) * 100;
    const sellerRevenueTrend =
      lastRev.sellerRev === 0
        ? currRev.sellerRev > 0
          ? 100
          : 0
        : ((currRev.sellerRev - lastRev.sellerRev) / lastRev.sellerRev) * 100;

    return {
      userCount,
      orderCount,
      productCount,
      totalRevenue,
      adminRevenue,
      sellerRevenue,
      trends: {
        users: Math.round(usersTrend),
        orders: Math.round(ordersTrend),
        products: Math.round(productsTrend),
        revenue: Math.round(revenueTrend),
        adminRevenue: Math.round(adminRevenueTrend),
        sellerRevenue: Math.round(sellerRevenueTrend),
      },
    };
  }

  async getRecentOrders(limit: number = 5) {
    return this.orderRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user', 'items', 'items.product', 'items.product.shop'],
    });
  }

  async getTopProducts(limit: number = 5) {
    return this.productRepository.find({
      order: { soldCount: 'DESC' },
      take: limit,
      relations: ['category', 'shop'],
    });
  }
}
