import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Voucher, VoucherType } from './entities/voucher.entity';
import { UserVoucher } from './entities/user-voucher.entity';
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
    @InjectRepository(UserVoucher)
    private readonly userVoucherRepository: Repository<UserVoucher>,
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

    // Manually handle dates if they come as strings
    if (updateData.startDate) voucher.startDate = new Date(updateData.startDate);
    if (updateData.endDate) voucher.endDate = new Date(updateData.endDate);

    // Filter out dates from updateData to avoid re-assigning them as potential strings
    const { startDate, endDate, ...otherData } = updateData;
    Object.assign(voucher, otherData);

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

  async applyVoucher(userId: number, code: string, itemIds?: number[]) {
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

    const userVoucher = await this.userVoucherRepository.findOne({
      where: { userId, voucherId: voucher.id },
    });

    if (userVoucher && userVoucher.usedCount >= voucher.userUsageLimit) {
      throw new BadRequestException(`Bạn đã sử dụng hết lượt của voucher này (Tối đa ${voucher.userUsageLimit} lần)`);
    }

    // Get cart total and items
    const allCartItems = await this.cartService.getCartItems(userId);
    if (!allCartItems.length) {
      throw new BadRequestException('Cart is empty');
    }

    // Filter to only selected items if itemIds provided
    const cartItems = itemIds && itemIds.length > 0
      ? allCartItems.filter(item => itemIds.includes(item.id))
      : allCartItems;

    if (!cartItems.length) {
      throw new BadRequestException('No selected items found in cart');
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

  async assignWelcomeVoucher(userId: number): Promise<void> {
    const code = 'WELCOME20';
    let voucher = await this.voucherRepository.findOne({ where: { code } });

    if (!voucher) {
      voucher = this.voucherRepository.create({
        code,
        type: VoucherType.PERCENT,
        value: 20,
        maxDiscountAmount: 30000,
        minOrderAmount: 50000,
        usageLimit: 0, // unlimited (per-user tracking via UserVoucher)
        usedCount: 0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        isActive: true,
        applicableCategories: [],
        applicableBrands: [],
      });
      await this.voucherRepository.save(voucher);
    }

    const existing = await this.userVoucherRepository.findOne({
      where: { userId, voucherId: voucher.id },
    });
    if (!existing) {
      await this.userVoucherRepository.save(
        this.userVoucherRepository.create({ userId, voucherId: voucher.id }),
      );
    }
  }

  async getUserVouchers(userId: number): Promise<UserVoucher[]> {
    const uvs = await this.userVoucherRepository.find({
      where: { userId, voucher: { isActive: true } },
      relations: ['voucher', 'voucher.applicableCategories', 'voucher.applicableBrands'],
    });
    // Only return those that haven't reached the per-user limit
    return uvs.filter(uv => uv.usedCount < uv.voucher.userUsageLimit);
  }

  async markUserVoucherUsed(userId: number, voucherCode: string): Promise<void> {
    const voucher = await this.voucherRepository.findOne({ where: { code: voucherCode } });
    if (!voucher) return;
    
    const userVoucher = await this.userVoucherRepository.findOne({ where: { userId, voucherId: voucher.id } });
    if (userVoucher) {
      userVoucher.usedCount += 1;
      await this.userVoucherRepository.save(userVoucher);
    } else {
      await this.userVoucherRepository.insert({ userId, voucherId: voucher.id, usedCount: 1 });
    }
  }

  async incrementUsage(voucherId: number) {
    await this.voucherRepository.increment({ id: voucherId }, 'usedCount', 1);
  }

  async getPublicVouchers(userId?: number): Promise<any[]> {
    const now = new Date();
    const vouchers = await this.voucherRepository.find({
      where: { isActive: true },
      relations: ['applicableCategories', 'applicableBrands'],
      order: { createdAt: 'DESC' },
    });

    // Filter to only valid date range
    const valid = vouchers.filter(v => now >= v.startDate && now <= v.endDate);

    if (!userId) return valid.map(v => ({ ...v, isCollected: false }));

    const userVouchers = await this.userVoucherRepository.find({ where: { userId } });
    const collectedMap = new Map<number, number>(userVouchers.map(uv => [uv.voucherId, uv.usedCount]));

    return valid
      .filter(v => {
        const usedCount = collectedMap.get(v.id) || 0;
        return usedCount < v.userUsageLimit;
      })
      .map(v => {
        const usedCount = collectedMap.get(v.id) || 0;
        return { 
          ...v, 
          isCollected: collectedMap.has(v.id),
          isFullyUsed: usedCount >= v.userUsageLimit
        };
      });
  }

  async collectVoucher(userId: number, voucherId: number): Promise<void> {
    const voucher = await this.voucherRepository.findOne({ where: { id: voucherId, isActive: true } });
    if (!voucher) throw new NotFoundException('Voucher not found or inactive');

    const now = new Date();
    if (now > voucher.endDate) throw new BadRequestException('Voucher đã hết hạn');

    const existing = await this.userVoucherRepository.findOne({ where: { userId, voucherId } });
    if (existing && existing.usedCount >= voucher.userUsageLimit) {
        throw new BadRequestException('Bạn đã thu thập và sử dụng hết lượt của voucher này rồi');
    }
    if (existing) {
        throw new BadRequestException('Bạn đã thu thập voucher này rồi');
    }

    await this.userVoucherRepository.save(
      this.userVoucherRepository.create({ userId, voucherId }),
    );
  }
}
