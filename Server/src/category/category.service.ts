import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
  ) {}
  async createCategory(data: CreateCategoryDto): Promise<Category> {
    const newCategory = this.categoryRepo.create(data);
    return await this.categoryRepo.save(newCategory);
  }
  async getCategories(): Promise<Category[]> {
    return await this.categoryRepo.find();
  }
  async getCategoryById(id: number): Promise<Category | null> {
    return await this.categoryRepo.findOneBy({ id });
  }
  async updateCategory(id: number, data: Partial<Category>): Promise<Category> {
    await this.categoryRepo.update(id, data);
    const updatedCategory = await this.categoryRepo.findOneBy({ id });
    if (!updatedCategory) {
      throw new Error('Category not found');
    }
    return updatedCategory;
  }
  async deleteCategory(id: number): Promise<void> {
    await this.categoryRepo.delete(id);
  }
}
