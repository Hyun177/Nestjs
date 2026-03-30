import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, MinLength } from 'class-validator';

export class ProductDto {
  @MinLength(3)
  name: string;

  @Type(() => Number)
  @IsNumber()
  price: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  originalPrice?: number;

  description: string;

  @IsOptional()
  image?: string;

  @IsOptional()
  descIntro?: string;

  @IsOptional()
  descFeatures?: string;

  @IsOptional()
  descPolicy?: string;

  @Type(() => Number)
  @IsNumber()
  categoryId: number;

  @Type(() => Number)
  @IsNumber()
  brandId: number;

  @Type(() => Number)
  @IsNumber()
  stock: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  rating?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  numReviews?: number;

  @Type(() => Boolean)
  @IsOptional()
  isFeatured?: boolean;

  @Type(() => Boolean)
  @IsOptional()
  isArchived?: boolean;

  @IsOptional()
  labels?: string[];

  @IsOptional()
  specs?: { icon: string; text: string }[];

  @IsOptional()
  promoNote?: string;

  @IsOptional()
  attributes?: { name: string; options: string[] }[];

  @IsOptional()
  variants?: {
    sku: string;
    price: number;
    stock: number;
    attributes: { [key: string]: string };
  }[];

  @IsOptional()
  images?: string[];

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  soldCount?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  viewCount?: number;

  @IsOptional()
  existingImages?: string | string[];
}

export class CreateProductDto extends ProductDto {}

export class UpdateProductDto extends PartialType(ProductDto) {}
