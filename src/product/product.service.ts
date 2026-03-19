import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}
  async createProduct(data: ProductDto, userId: number): Promise<Product> {
    const newProduct = this.productRepository.create({ ...data, userId });
    return await this.productRepository.save(newProduct);
  }
  async getProducts(): Promise<Product[]> {
    return await this.productRepository.find();
  }
  async getProductById(id: number): Promise<Product | null> {
    return await this.productRepository.findOneBy({ id });
  }
  async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    await this.productRepository.update(id, data);
    const updatedProduct = await this.productRepository.findOneBy({ id });
    if (!updatedProduct) {
      throw new Error('Product not found');
    }
    return updatedProduct;
  }
  async deleteProduct(id: number): Promise<void> {
    await this.productRepository.delete(id);
  }
}
