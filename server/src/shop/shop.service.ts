import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import { Shop } from './entities/shop.entity';
import { Product } from '../product/entities/product.entity';
import { ShopFollower } from './entities/shop-follower.entity';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop)
    private shopRepository: Repository<Shop>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ShopFollower)
    private followerRepository: Repository<ShopFollower>,
    private dataSource: DataSource,
  ) {}

  async findBySeller(userId: number) {
    if (isNaN(userId)) throw new NotFoundException('Invalid Seller ID');
    let shop = await this.shopRepository.findOne({ where: { userId } });
    if (!shop) {
      // Auto-create a default shop for sellers who don't have one
      shop = this.shopRepository.create({
        userId,
        name: 'My Shop',
        description: 'New shop on the marketplace',
      });
      await this.shopRepository.save(shop);
    }
    return shop;
  }

  async findById(id: number) {
    if (isNaN(id)) throw new NotFoundException('Invalid Shop ID');
    const shop = await this.shopRepository.findOne({ where: { id } });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async update(userId: number, updateDto: any) {
    const shop = await this.findBySeller(userId);
    Object.assign(shop, updateDto);
    return this.shopRepository.save(shop);
  }

  async updateById(id: number, updateDto: any) {
    const shop = await this.findById(id);
    Object.assign(shop, updateDto);
    return this.shopRepository.save(shop);
  }

  async follow(userId: number, sellerId: number) {
    const shop = await this.findBySeller(sellerId);

    // Check if already following
    const existing = await this.followerRepository.findOne({
      where: { userId, shopId: shop.id },
    });

    if (existing) {
      // Unfollow if requested (toggle behavior usually expected for "Save" state)
      await this.followerRepository.remove(existing);
      shop.followerCount = Math.max(0, shop.followerCount - 1);
    } else {
      // Follow
      const follow = this.followerRepository.create({
        userId,
        shopId: shop.id,
      });
      await this.followerRepository.save(follow);
      shop.followerCount++;
    }

    return this.shopRepository.save(shop);
  }

  async isFollowing(userId: number, sellerId: number) {
    const shop = await this.shopRepository.findOne({
      where: { userId: sellerId },
    });
    if (!shop) return false;
    const follow = await this.followerRepository.findOne({
      where: { userId, shopId: shop.id },
    });
    return !!follow;
  }

  async getShopStats(sellerId: number) {
    const products = await this.productRepository.find({
      where: { userId: sellerId },
    });
    const totalProducts = products.length;
    const ratedProducts = products.filter((p) => p.numReviews > 0);
    const avgRating =
      ratedProducts.length > 0
        ? ratedProducts.reduce((acc, p) => acc + Number(p.rating), 0) /
          ratedProducts.length
        : 0;

    return {
      totalProducts,
      avgRating: Number(avgRating.toFixed(1)),
      totalReviews: products.reduce((acc, p) => acc + (p.numReviews || 0), 0),
    };
  }
  async searchShops(query: string) {
    if (!query) return [];
    const shops = await this.shopRepository.find({
      where: { name: Like(`%${query}%`) },
      take: 3,
    });

    // Add some products for each shop
    const results = await Promise.all(
      shops.map(async (shop) => {
        const sampleProducts = await this.productRepository.find({
          where: { shopId: shop.id, isArchived: false },
          take: 4,
        });
        return { ...shop, sampleProducts };
      }),
    );

    return results;
  }
}
