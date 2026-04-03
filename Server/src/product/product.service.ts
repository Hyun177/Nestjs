import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { ProductDto, UpdateProductDto } from './dto/product.dto';
import { Category } from '../category/entities/category.entity/category.entity';
import { Brand } from '../brand/entities/brand.entity/brand.entity';
import { Shop } from '../shop/entities/shop.entity';

type ProductQueryParams = {
  showAll?: boolean | 'true' | 'false';
  search?: string;
  categoryId?: number | string;
  brandId?: number | string;
  minPrice?: number | string;
  maxPrice?: number | string;
  color?: string;
  onSale?: boolean | 'true' | 'false';
  newArrival?: boolean | 'true' | 'false';
  sort?: 'newest' | 'price_asc' | 'price_desc';
  userId?: number | string;
  sellerId?: number | string;
  shopId?: number | string;
  page?: number | string;
  limit?: number | string;
};

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
    @InjectRepository(Shop)
    private shopRepository: Repository<Shop>,
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

    const originalPrice = data.originalPrice
      ? Number(data.originalPrice)
      : undefined;

    // Parse labels and specs if they arrive as strings from multipart
    let labels = data.labels;
    if (typeof labels === 'string') {
      try {
        labels = JSON.parse(labels);
      } catch {
        labels = [];
      }
    }

    let specs = data.specs;
    if (typeof specs === 'string') {
      try {
        specs = JSON.parse(specs);
      } catch {
        specs = [];
      }
    }

    let attributes = data.attributes;
    if (typeof attributes === 'string') {
      try {
        attributes = JSON.parse(attributes);
      } catch {
        attributes = [];
      }
    }

    let variants = data.variants;
    if (typeof variants === 'string') {
      try {
        variants = JSON.parse(variants);
      } catch {
        variants = [];
      }
    }

    let extraImages = data.images;
    if (typeof extraImages === 'string') {
      try {
        extraImages = JSON.parse(extraImages);
      } catch {
        extraImages = [];
      }
    }

    let shopCategoryIds = (data as any).shopCategoryIds;
    if (typeof shopCategoryIds === 'string') {
      try {
        shopCategoryIds = JSON.parse(shopCategoryIds);
      } catch {
        shopCategoryIds = [];
      }
    }
    const shopCategoriesRelation = Array.isArray(shopCategoryIds) 
      ? shopCategoryIds.map((id: number) => ({ id })) 
      : [];

    // FIND SHOP FOR THIS USER
    const shop = await this.shopRepository.findOne({ where: { userId } });
    const shopId = shop ? shop.id : undefined;

    const product = this.productRepository.create({
      ...data,
      categoryId,
      brandId,
      price,
      stock,
      userId,
      shopId,
      rating: data.rating ?? 5,
      numReviews: data.numReviews ?? 0,
      isFeatured: typeof data.isFeatured === 'boolean' 
        ? data.isFeatured 
        : String(data.isFeatured) === 'true',
      isArchived: typeof data.isArchived === 'boolean' 
        ? data.isArchived 
        : String(data.isArchived) === 'true',
      soldCount: data.soldCount ? Number(data.soldCount) : 0,
      viewCount: data.viewCount ? Number(data.viewCount) : 0,
      originalPrice,
      labels,
      specs,
      attributes,
      variants,
      images: extraImages,
      promoNote: data.promoNote,
      shopCategories: shopCategoriesRelation,
    });

    return await this.productRepository.save(product);
  }
  async getProducts(
    params?: ProductQueryParams,
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.shopCategories', 'shopCategories')
      .leftJoinAndSelect('product.shop', 'shop');

    // Chỉ hiển thị sản phẩm chưa bị ẩn cho user (admin có thể truyền showAll=true)
    const showAll = params?.showAll === 'true' || params?.showAll === true;
    if (!showAll) {
      query.andWhere('product.isArchived = :isArchived', { isArchived: false });
    }

    if (params?.search) {
      query.andWhere(
        '(product.name LIKE :search OR category.name LIKE :search OR brand.name LIKE :search OR shop.name LIKE :search)',
        { search: `%${params.search}%` },
      );
    }
    if (params?.categoryId) {
      query.andWhere('product.categoryId = :categoryId', {
        categoryId: params.categoryId,
      });
    }
    if (params?.brandId) {
      query.andWhere('product.brandId = :brandId', { brandId: params.brandId });
    }
    if (params?.sellerId) {
      query.andWhere('product.userId = :sellerId', { sellerId: params.sellerId });
    }
    if (params?.userId !== undefined && params?.userId !== null && params?.userId !== '') {
      query.andWhere('product.userId = :userId', { userId: params.userId });
    }
    if (params?.shopId === '0' || params?.shopId === 0) {
      query.andWhere('(product.shopId IS NULL OR product.shopId = 0)');
    } else if (params?.shopId) {
      query.andWhere('product.shopId = :shopId', { shopId: params.shopId });
    }
    if (params?.minPrice) {
      query.andWhere('product.price >= :minPrice', {
        minPrice: Number(params.minPrice),
      });
    }
    if (params?.maxPrice) {
      query.andWhere('product.price <= :maxPrice', {
        maxPrice: Number(params.maxPrice),
      });
    }
    if (params?.color) {
      // Filter products whose attributes JSON contains the given color value (MySQL uses AS CHAR instead of AS TEXT)
      query.andWhere('LOWER(CAST(product.attributes AS CHAR)) LIKE :color', {
        color: `%${String(params.color).toLowerCase()}%`,
      });
    }

    if (params?.onSale === 'true' || params?.onSale === true) {
      query.andWhere(
        'product.originalPrice IS NOT NULL AND product.originalPrice > product.price',
      );
    }

    if (params?.newArrival === 'true' || params?.newArrival === true) {
      // Products added in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.andWhere('product.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo });
    }

    if (params?.sort === 'newest') {
      query.orderBy('product.createdAt', 'DESC');
    } else if (params?.sort === 'price_asc') {
      query.orderBy('product.price', 'ASC');
    } else if (params?.sort === 'price_desc') {
      query.orderBy('product.price', 'DESC');
    } else {
      query.orderBy('product.id', 'DESC');
    }

    const pageRaw = params?.page;
    const limitRaw = params?.limit;

    let page = 1;
    let limit = 10;

    if (pageRaw !== undefined) {
      const pageNum = Number(pageRaw);
      if (!Number.isNaN(pageNum) && pageNum >= 1) {
        page = Math.floor(pageNum);
      }
    }

    if (limitRaw !== undefined) {
      const limitNum = Number(limitRaw);
      if (!Number.isNaN(limitNum) && limitNum >= 1) {
        limit = Math.floor(limitNum);
      }
    }

    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total, page, limit };
  }
  async getProductById(id: number): Promise<Product | null> {
    return await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'brand', 'shop', 'shopCategories'],
    });
  }
  async updateProduct(id: number, data: UpdateProductDto): Promise<Product> {
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
    if (data.originalPrice !== undefined)
      data.originalPrice = Number(data.originalPrice);
    if (data.isFeatured !== undefined) {
      data.isFeatured = typeof data.isFeatured === 'boolean' 
        ? data.isFeatured 
        : String(data.isFeatured) === 'true';
    }
    if (data.isArchived !== undefined) {
      data.isArchived = typeof data.isArchived === 'boolean' 
        ? data.isArchived 
        : String(data.isArchived) === 'true';
    }

    // Parse JSON
    const jsonFields = ['labels', 'specs', 'attributes', 'variants', 'images', 'shopCategoryIds'];
    for (const field of jsonFields) {
      if (typeof data[field] === 'string') {
        try {
          data[field] = JSON.parse(data[field]);
        } catch {
          data[field] = [];
        }
      }
    }

    if (data['shopCategoryIds']) {
      data['shopCategories'] = data['shopCategoryIds'].map((id: number) => ({ id }));
      delete data['shopCategoryIds'];
    }

    // Merge existingImages (kept from before) with newly uploaded images
    if (data.existingImages !== undefined) {
      let existing: string[] = [];
      if (typeof data.existingImages === 'string') {
        try {
          const jsonString: string = data.existingImages;
          const parsed = JSON.parse(jsonString);
          existing = Array.isArray(parsed) ? (parsed as string[]) : [];
        } catch {
          existing = [];
        }
      } else if (Array.isArray(data.existingImages)) {
        existing = data.existingImages;
      }
      const newImages: string[] = Array.isArray(data.images) ? data.images : [];
      data.images = [...existing, ...newImages];
      delete data.existingImages;
    }

    // Remove unknown fields that are not Product columns
    delete data.descIntro;
    delete data.descFeatures;
    delete data.descPolicy;

    // Clean up empty data
    if (Object.keys(data).length === 0) {
      throw new Error('No valid update values provided');
    }

    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['shopCategories']
    });
    if (!product) throw new Error('Product not found');

    // Use save() instead of update() to handle ManyToMany relations properly
    // and trigger entity listeners
    Object.assign(product, data);
    return await this.productRepository.save(product);
  }

  async deleteProduct(id: number): Promise<void> {
    await this.productRepository.delete(id);
  }

  async getTopSelling(limit: number = 4): Promise<Product[]> {
    return await this.productRepository.find({
      where: { isArchived: false },
      relations: ['category', 'brand'],
      order: {
        soldCount: 'DESC',
        viewCount: 'DESC',
      },
      take: limit,
    });
  }
}
