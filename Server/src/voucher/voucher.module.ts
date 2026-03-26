import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voucher } from './entities/voucher.entity';
import { VoucherService } from './voucher.service';
import { VoucherController } from './voucher.controller';
import { Category } from '../category/entities/category.entity/category.entity';
import { Brand } from '../brand/entities/brand.entity/brand.entity';
import { CartModule } from '../cart/cart.module';
import { AuthModule } from '../auth/auth.module';
import { UserVoucher } from './entities/user-voucher.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Voucher, UserVoucher, Category, Brand]),
    CartModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [VoucherController],
  providers: [VoucherService],
  exports: [VoucherService],
})
export class VoucherModule {}
