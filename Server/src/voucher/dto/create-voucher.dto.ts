import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDate,
  IsBoolean,
  Min,
  IsArray,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { VoucherType } from '../entities/voucher.entity';

export class CreateVoucherDto {
  @ApiProperty({ example: 'SALE10', description: 'Voucher code' })
  @IsString()
  code: string;

  @ApiProperty({ enum: VoucherType, example: VoucherType.PERCENT })
  @IsEnum(VoucherType)
  type: VoucherType;

  @ApiProperty({ example: 10, description: 'Discount value (fixed amount or percentage)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ example: 50000, description: 'Maximum discount amount for PERCENT type' })
  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number | null;

  @ApiProperty({ example: 200000, description: 'Minimum order amount to apply voucher' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderAmount: number;

  @ApiProperty({ example: 100, description: 'Total number of times this voucher can be used' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  usageLimit: number;

  @ApiProperty({ example: 1, description: 'How many times each user can use this voucher' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  userUsageLimit?: number;

  @ApiProperty({ example: '2024-03-24T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({ example: '2024-12-24T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [Number], example: [1, 2], description: 'List of applicable category IDs' })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  categoryIds?: number[];

  @ApiPropertyOptional({ type: [Number], example: [1], description: 'List of applicable brand IDs' })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  brandIds?: number[];
}
