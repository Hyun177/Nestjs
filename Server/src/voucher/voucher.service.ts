import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Voucher, VoucherType } from './entities/voucher.entity';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { Category } from '../category/entities/category.entity/category.entity';
import { Brand } from '../brand/entities/brand.entity/brand.entity';
import { CartService } from '../cart/cart.service';

@Injectable()
export class VoucherService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    private readonly cartService: CartService,
  ) {}

  async create(createVoucherDto: CreateVoucherDto): Promise<Voucher> {
    const { categoryIds, brandIds, ...voucherData } = createVoucherDto;

    const voucher = new Voucher();
    Object.assign(voucher, voucherData);

    if (categoryIds && categoryIds.length > 0) {
      voucher.applicableCategories = await this.categoryRepository.findBy({
        id: In(categoryIds),
      });
    }

    if (brandIds && brandIds.length > 0) {
      voucher.applicableBrands = await this.brandRepository.findBy({
        id: In(brandIds),
      });
    }

    return this.voucherRepository.save(voucher);
  }

  async findAll(): Promise<Voucher[]> {
    return this.voucherRepository.find({
      relations: ['applicableCategories', 'applicableBrands'],
    });
  }

  async findOne(id: number): Promise<Voucher> {
    const voucher = await this.voucherRepository.findOne({
      where: { id },
      relations: ['applicableCategories', 'applicableBrands'],
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with id ${id} not found`);
    }

    return voucher;
  }

  async update(
    id: number,
    updateVoucherDto: UpdateVoucherDto,
  ): Promise<Voucher> {
    const voucher = await this.findOne(id);
    const { categoryIds, brandIds, ...updateData } = updateVoucherDto;

    Object.assign(voucher, updateData);

    if (categoryIds) {
      voucher.applicableCategories = await this.categoryRepository.findBy({
        id: In(categoryIds),
      });
    }

    if (brandIds) {
      voucher.applicableBrands = await this.brandRepository.findBy({
        id: In(brandIds),
      });
    }

    return this.voucherRepository.save(voucher);
  }

  async remove(id: number): Promise<void> {
    const voucher = await this.findOne(id);
    await this.voucherRepository.remove(voucher);
  }

  async applyVoucher(userId: number, code: string) {
    const voucher = await this.voucherRepository.findOne({
      where: { code, isActive: true },
      relations: ['applicableCategories', 'applicableBrands'],
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found or inactive');
    }

    const now = new Date();
    if (now < voucher.startDate || now > voucher.endDate) {
      throw new BadRequestException('Voucher is expired or not yet valid');
    }

    if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
      throw new BadRequestException('Voucher usage limit reached');
    }

    // Get cart total and items
    const cartItems = await this.cartService.getCartItems(userId);
    if (!cartItems.length) {
      throw new BadRequestException('Cart is empty');
    }

    // Filter items applicable for voucher
    const hasCategoryRestriction = voucher.applicableCategories.length > 0;
    const hasBrandRestriction = voucher.applicableBrands.length > 0;

    let applicableTotal = 0;
    const applicableItemsIds: number[] = [];

    for (const item of cartItems) {
      let isApplicable = true;

      if (hasCategoryRestriction) {
        if (
          !voucher.applicableCategories.some(
            (cat) => cat.id === item.product.categoryId,
          )
        ) {
          isApplicable = false;
        }
      }

      if (hasBrandRestriction) {
        if (
          !voucher.applicableBrands.some(
            (brand) => brand.id === item.product.brandId,
          )
        ) {
          isApplicable = false;
        }
      }

      if (isApplicable) {
        applicableTotal += Number(item.price) * item.quantity;
        applicableItemsIds.push(item.id);
      }
    }

    if (applicableTotal < Number(voucher.minOrderAmount)) {
      throw new BadRequestException(
        `Minimum order amount for this voucher is ${voucher.minOrderAmount}`,
      );
    }

    if (applicableTotal === 0) {
      throw new BadRequestException(
        'No products in cart are applicable for this voucher',
      );
    }

    let discount = 0;
    if (voucher.type === VoucherType.PERCENT) {
      discount = (applicableTotal * Number(voucher.value)) / 100;
      if (
        voucher.maxDiscountAmount &&
        discount > Number(voucher.maxDiscountAmount)
      ) {
        discount = Number(voucher.maxDiscountAmount);
      }
    } else {
      discount = Number(voucher.value);
    }

    // Discount cannot be more than the applicable total
    if (discount > applicableTotal) {
      discount = applicableTotal;
    }

    return {
      voucherId: voucher.id,
      code: voucher.code,
      discount: Number(discount.toFixed(2)),
      applicableItemsIds,
    };
  }

  async incrementUsage(voucherId: number) {
    await this.voucherRepository.increment({ id: voucherId }, 'usedCount', 1);
  }
}
