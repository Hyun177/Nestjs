import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateConversationDto {
  @IsNumber()
  @Type(() => Number)
  targetUserId!: number;
}
