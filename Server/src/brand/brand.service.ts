import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Brand } from './entities/brand.entity/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto/create-brand.dto';

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
  ) {}
  async createBrand(data: CreateBrandDto, userId?: number): Promise<Brand> {
    const newBrand = this.brandRepository.create({ ...data, userId: userId });
    return await this.brandRepository.save(newBrand);
  }
  async getBrands(categoryId?: number): Promise<Brand[]> {
    const where: any = { userId: IsNull() };
    if (categoryId) where.categoryId = categoryId;
    return await this.brandRepository.find({ 
      where,
      relations: ['category'] 
    });
  }
  async getSellerBrands(userId: number, categoryId?: number): Promise<Brand[]> {
    const where: any = { userId };
    if (categoryId) where.categoryId = categoryId;
    return await this.brandRepository.find({ 
      where,
      relations: ['category']
    });
  }
  async getAllBrandsAdmin(): Promise<Brand[]> {
    return await this.brandRepository.find({ relations: ['category'] });
  }
  async getBrandById(id: number): Promise<Brand | null> {
    return await this.brandRepository.findOne({ 
      where: { id },
      relations: ['category']
    });
  }
  async updateBrand(id: number, data: Partial<Brand>): Promise<Brand> {
    await this.brandRepository.update(id, data);
    const updatedBrand = await this.brandRepository.findOneBy({ id });
    if (!updatedBrand) {
      throw new Error('Brand not found');
    }
    return updatedBrand;
  }
  async deleteBrand(id: number): Promise<void> {
    await this.brandRepository.delete(id);
  }
}
