import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async createOrUpdateReview(
    userId: number,
    productId: number,
    rating: number,
    comment: string,
    image?: string,
    orderId?: number,
  ) {
    if (rating < 1 || rating > 5) throw new BadRequestException('Rating must be between 1 and 5');

    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new BadRequestException('Product not found');

    // Chỉ cho phép đánh giá khi đơn hàng ở trạng thái DELIVERED
    const orderCheck = await this.orderRepo.findOne({
      where: {
        userId,
        status: OrderStatus.DELIVERED,
        items: { productId },
        ...(orderId ? { id: orderId } : {}),
      },
      relations: ['items'],
    });

    if (!orderCheck) {
      throw new ForbiddenException('Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao thành công.');
    }

    const reviewOrderId = orderId || orderCheck.id;

    // Mỗi user chỉ được đánh giá 1 lần cho mỗi sản phẩm
    let review = await this.reviewRepo.findOne({ where: { userId, productId } });

    if (review) {
      review.rating = rating;
      review.comment = comment;
      if (image) review.image = image;
    } else {
      review = this.reviewRepo.create({ userId, productId, orderId: reviewOrderId, rating, comment, image });
    }

    const saved = await this.reviewRepo.save(review);
    await this.updateProductStats(productId);
    return saved;
  }

  async updateReview(reviewId: number, userId: number, rating: number, comment: string, image?: string) {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    if (review.userId !== userId) throw new ForbiddenException('Bạn không có quyền sửa đánh giá này');

    if (rating < 1 || rating > 5) throw new BadRequestException('Rating must be between 1 and 5');

    review.rating = rating;
    review.comment = comment;
    if (image) review.image = image;

    const saved = await this.reviewRepo.save(review);
    await this.updateProductStats(review.productId);
    return saved;
  }

  async deleteReview(reviewId: number, userId: number) {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    if (review.userId !== userId) throw new ForbiddenException('Bạn không có quyền xóa đánh giá này');

    const productId = review.productId;
    await this.reviewRepo.remove(review);
    await this.updateProductStats(productId);
    return { message: 'Đã xóa đánh giá thành công' };
  }

  async getMyReview(userId: number, productId: number) {
    return this.reviewRepo.findOne({ where: { userId, productId } });
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
      order: { createdAt: 'DESC' },
    });
  }

  async canUserReview(userId: number, productId: number): Promise<boolean> {
    const order = await this.orderRepo.findOne({
      where: { userId, status: OrderStatus.DELIVERED, items: { productId } },
      relations: ['items'],
    });
    return !!order;
  }
}
