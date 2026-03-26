import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { PaymentMethod } from '../../payment/enums/payment-method.enum';

export class CheckoutDto {
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @IsOptional()
  itemIds?: number[];

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsNumber()
  addressId?: number;

  @IsOptional()
  @IsNumber()
  shippingFee?: number;
}
