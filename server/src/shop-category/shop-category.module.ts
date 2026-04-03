import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopCategoryService } from './shop-category.service';
import { ShopCategoryController } from './shop-category.controller';
import { ShopCategory } from './entities/shop-category.entity';
import { Shop } from '../shop/entities/shop.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShopCategory, Shop])],
  controllers: [ShopCategoryController],
  providers: [ShopCategoryService],
  exports: [ShopCategoryService],
})
export class ShopCategoryModule {}
