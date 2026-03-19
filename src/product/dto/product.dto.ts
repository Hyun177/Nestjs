import { PartialType } from '@nestjs/swagger';
import { IsNumber, MinLength } from 'class-validator';

export class ProductDto {
  @MinLength(3)
  name: string;
  @IsNumber()
  price: number;
  description: string;
  image: string;
  category: string;
  brand: string;
  stock: number;
  @IsNumber()
  rating: number;
  numReviews: number;
  isFeatured: boolean;
  isArchived: boolean;
}
export class CreateProductDto extends ProductDto {}
export class UpdateProductDto extends PartialType(ProductDto) {}
