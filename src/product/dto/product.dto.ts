import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, MinLength } from 'class-validator';

export class ProductDto {
  @MinLength(3)
  name: string;

  @Type(() => Number)
  @IsNumber()
  price: number;

  description: string;

  @IsOptional()
  image?: string;

  category: string;
  brand: string;

  @Type(() => Number)
  @IsNumber()
  stock: number;

  @Type(() => Number)
  @IsNumber()
  rating: number;

  @Type(() => Number)
  @IsNumber()
  numReviews: number;

  @Type(() => Boolean)
  isFeatured: boolean;

  @Type(() => Boolean)
  isArchived: boolean;
}
export class CreateProductDto extends ProductDto {}
export class UpdateProductDto extends PartialType(ProductDto) {}
