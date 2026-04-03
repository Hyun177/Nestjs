import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { Category } from '../category/entities/category.entity/category.entity';
import { Brand } from '../brand/entities/brand.entity/brand.entity';
import { Shop } from '../shop/entities/shop.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, Brand, Shop])],
  providers: [ProductService],
  controllers: [ProductController],
})
export class ProductModule {}
