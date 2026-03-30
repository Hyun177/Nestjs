// dto/query-product.dto.ts
export class QueryProductDto {
  search?: string;
  categoryId?: number;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  onSale?: boolean;
  newArrival?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
  showAll?: boolean;
}
