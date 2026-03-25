import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../../payment/enums/payment-method.enum';

export class CheckoutDto {
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @IsOptional()
  itemIds?: number[];

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
