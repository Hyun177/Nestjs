import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { Shop } from './entities/shop.entity';
import { Product } from '../product/entities/product.entity';
import { ShopFollower } from './entities/shop-follower.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, Product, ShopFollower])],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
