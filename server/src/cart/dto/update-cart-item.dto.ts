import { IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;
}
