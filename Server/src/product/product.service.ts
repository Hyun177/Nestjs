import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { ProductDto } from './dto/product.dto';
import { Category } from '../category/entities/category.entity/category.entity';
import { Brand } from '../brand/entities/brand.entity/brand.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
  ) {}
  async createProduct(data: ProductDto, userId: number): Promise<Product> {
    const categoryId = Number(data.categoryId);
    const brandId = Number(data.brandId);
    const price = Number(data.price);
    const stock = Number(data.stock);

    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new Error('Category not found');
    }

    const brand = await this.brandRepository.findOne({
      where: { id: brandId },
    });
    if (!brand) {
      throw new Error('Brand not found');
    }

    const originalPrice = data.originalPrice ? Number(data.originalPrice) : undefined;
    
    // Parse labels and specs if they arrive as strings from multipart
    let labels = data.labels;
    if (typeof labels === 'string') {
      try {
        labels = JSON.parse(labels);
      } catch (e) {
        labels = [];
      }
    }

    let specs = data.specs;
    if (typeof specs === 'string') {
      try {
        specs = JSON.parse(specs);
      } catch (e) {
        specs = [];
      }
    }

    return await this.productRepository.save({
      ...data,
      categoryId,
      brandId,
      price,
      stock,
      userId,
      rating: data.rating ?? 5,
      numReviews: data.numReviews ?? 0,
      isFeatured: data.isFeatured ?? false,
      isArchived: data.isArchived ?? false,
      soldCount: data.soldCount ?? 0,
      viewCount: data.viewCount ?? 0,
      originalPrice,
      labels,
      specs,
      promoNote: data.promoNote,
    } as any);
  }
  async getProducts(): Promise<Product[]> {
    return await this.productRepository.find({
      relations: ['category', 'brand'],
    });
  }
  async getProductById(id: number): Promise<Product | null> {
    return await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'brand'],
    });
  }
  async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    if (data.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new Error('Category not found');
      }
    }
    if (data.brandId) {
      const brand = await this.brandRepository.findOne({
        where: { id: Number(data.brandId) },
      });
      if (!brand) {
        throw new Error('Brand not found');
      }
    }
    await this.productRepository.update(id, data);
    const updatedProduct = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'brand'],
    });
    if (!updatedProduct) {
      throw new Error('Product not found');
    }
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    await this.productRepository.delete(id);
  }

  async getTopSelling(limit: number = 4): Promise<Product[]> {
    return await this.productRepository.find({
      relations: ['category', 'brand'],
      order: {
        soldCount: 'DESC',
        viewCount: 'DESC',
      },
      take: limit,
    });
  }
}
