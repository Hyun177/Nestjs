import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Product } from '../product/entities/product.entity';
import { Order } from '../order/entities/order.entity';
import { OrderStatus } from '../order/enums/order-status.enum';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private reviewRepo: Repository<Review>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  async createOrUpdateReview(userId: number, productId: number, rating: number, comment: string, image?: string, orderId?: number) {
    if (rating < 1 || rating > 5) throw new BadRequestException('Rating must be between 1 and 5');
    
    // Check if product exists
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new BadRequestException('Product not found');

    // 1. Check if user has purchased this product successfully
    const orderCheck = await this.orderRepo.findOne({
      where: {
        userId,
        status: In([OrderStatus.PAID, OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED]),
        items: { productId },
        ...(orderId ? { id: orderId } : {})
      },
      relations: ['items']
    });

    if (!orderCheck) {
      throw new ForbiddenException('Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua hàng thành công (đã thanh toán hoặc đang giao/đã giao).');
    }

    const reviewOrderId = orderId || orderCheck.id;

    // 2. Check for existing review for this specific order (or just product if legacy)
    let review = await this.reviewRepo.findOne({ 
      where: { 
        userId, 
        productId,
        ...(reviewOrderId ? { orderId: reviewOrderId } : {})
      } 
    });

    if (review) {
      // Update existing review
      review.rating = rating;
      review.comment = comment;
      if (image) review.image = image;
    } else {
      // Create new review
      review = this.reviewRepo.create({
        userId,
        productId,
        orderId: reviewOrderId,
        rating,
        comment,
        image
      });
    }

    const savedReview = await this.reviewRepo.save(review);
    
    // Update product rating and numReviews
    await this.updateProductStats(productId);

    return savedReview;
  }

  private async updateProductStats(productId: number) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) return;

    const allReviews = await this.reviewRepo.find({ where: { productId } });
    if (allReviews.length > 0) {
      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      product.numReviews = allReviews.length;
      product.rating = totalRating / allReviews.length;
    } else {
      product.numReviews = 0;
      product.rating = 0;
    }
    await this.productRepo.save(product);
  }

  async getProductReviews(productId: number) {
    return this.reviewRepo.find({
      where: { productId },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });
  }

  async canUserReview(userId: number, productId: number): Promise<boolean> {
      const order = await this.orderRepo.findOne({
          where: {
              userId,
              status: In([OrderStatus.PAID, OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED]),
              items: { productId }
          },
          relations: ['items']
      });
      return !!order;
  }
}
