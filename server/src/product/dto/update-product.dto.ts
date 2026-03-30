// dto/update-product.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { ProductDto } from './product.dto';

export class UpdateProductDto extends PartialType(ProductDto) {
  existingImages?: string[] | string;
  descIntro?: string;
  descFeatures?: string;
  descPolicy?: string;
  name?: string;
  price?: number;

  // Ảnh đang giữ lại (từ frontend)

  // Ảnh mới upload
  newImages?: string[];

  // Optional: thứ tự ảnh
  imageOrder?: string[];
}
