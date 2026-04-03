import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopCategory } from './entities/shop-category.entity';
import { Shop } from '../shop/entities/shop.entity';

@Injectable()
export class ShopCategoryService {
  constructor(
    @InjectRepository(ShopCategory)
    private categoryRepository: Repository<ShopCategory>,
    @InjectRepository(Shop)
    private shopRepository: Repository<Shop>,
  ) {}

  async create(userId: number, createDto: any) {
    const shop = await this.shopRepository.findOne({ where: { userId } });
    if (!shop) throw new NotFoundException('Shop not found for this seller');

    const category = this.categoryRepository.create({
      ...createDto,
      shopId: shop.id,
    });
    return this.categoryRepository.save(category);
  }

  async findAllByShop(shopId: number) {
    return this.categoryRepository.find({
      where: { shopId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }
  
  async findAllBySeller(userId: number) {
    const shop = await this.shopRepository.findOne({ where: { userId } });
    if (!shop) return [];
    return this.findAllByShop(shop.id);
  }

  async update(userId: number, id: number, updateDto: any) {
    const shop = await this.shopRepository.findOne({ where: { userId } });
    if (!shop) throw new NotFoundException('Shop not found');
    
    const category = await this.categoryRepository.findOne({ where: { id, shopId: shop.id } });
    if (!category) throw new NotFoundException('Category not found or unauthorized');

    Object.assign(category, updateDto);
    return this.categoryRepository.save(category);
  }

  async remove(userId: number, id: number) {
    const shop = await this.shopRepository.findOne({ where: { userId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const category = await this.categoryRepository.findOne({ where: { id, shopId: shop.id } });
    if (!category) throw new NotFoundException('Category not found or unauthorized');

    return this.categoryRepository.remove(category);
  }
}
