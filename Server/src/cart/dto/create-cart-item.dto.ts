import { IsNumber, Min, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCartItemDto {
  @Type(() => Number)
  @IsNumber()
  productId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  color?: string;
}
