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

    let attributes = data.attributes;
    if (typeof attributes === 'string') {
      try {
        attributes = JSON.parse(attributes);
      } catch (e) {
        attributes = [];
      }
    }

    let variants = data.variants;
    if (typeof variants === 'string') {
      try {
        variants = JSON.parse(variants);
      } catch (e) {
        variants = [];
      }
    }

    let extraImages = data.images;
    if (typeof extraImages === 'string') {
      try {
        extraImages = JSON.parse(extraImages);
      } catch (e) {
        extraImages = [];
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
      attributes,
      variants,
      images: extraImages,
      promoNote: data.promoNote,
    } as any);
  }
  async getProducts(params?: any): Promise<any> {
    const query = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand');

    if (params?.search) {
      query.andWhere('product.name LIKE :search', { search: `%${params.search}%` });
    }
    if (params?.categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId: params.categoryId });
    }
    if (params?.brandId) {
      query.andWhere('product.brandId = :brandId', { brandId: params.brandId });
    }
    if (params?.minPrice) {
      query.andWhere('product.price >= :minPrice', { minPrice: Number(params.minPrice) });
    }
    if (params?.maxPrice) {
      query.andWhere('product.price <= :maxPrice', { maxPrice: Number(params.maxPrice) });
    }
    if (params?.color) {
      // Filter products whose attributes JSON contains the given color value (MySQL uses AS CHAR instead of AS TEXT)
      query.andWhere('LOWER(CAST(product.attributes AS CHAR)) LIKE :color', {
        color: `%${String(params.color).toLowerCase()}%`,
      });
    }

    if (params?.sort === 'price_asc') {
      query.orderBy('product.price', 'ASC');
    } else if (params?.sort === 'price_desc') {
      query.orderBy('product.price', 'DESC');
    } else {
      query.orderBy('product.id', 'DESC');
    }

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total, page, limit };
  }
  async getProductById(id: number): Promise<Product | null> {
    return await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'brand'],
    });
  }
  async updateProduct(id: number, data: Partial<Product> | any): Promise<Product> {
    if (data.categoryId) {
      data.categoryId = Number(data.categoryId);
      const category = await this.categoryRepository.findOne({
        where: { id: data.categoryId },
      });
      if (!category) throw new Error('Category not found');
    }
    if (data.brandId) {
      data.brandId = Number(data.brandId);
      const brand = await this.brandRepository.findOne({
        where: { id: data.brandId },
      });
      if (!brand) throw new Error('Brand not found');
    }
    
    if (data.price !== undefined) data.price = Number(data.price);
    if (data.stock !== undefined) data.stock = Number(data.stock);
    if (data.originalPrice !== undefined) data.originalPrice = Number(data.originalPrice);
    if (data.isFeatured !== undefined) data.isFeatured = String(data.isFeatured) === 'true';
    if (data.isArchived !== undefined) data.isArchived = String(data.isArchived) === 'true';

    // Parse JSON
    const jsonFields = ['labels', 'specs', 'attributes', 'variants', 'images'];
    for (const field of jsonFields) {
      if (typeof data[field] === 'string') {
        try {
          data[field] = JSON.parse(data[field]);
        } catch {
          data[field] = [];
        }
      }
    }

    // Clean up empty data
    if (Object.keys(data).length === 0) {
      throw new Error('No valid update values provided');
    }

    await this.productRepository.update(id, data as Partial<Product>);
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
