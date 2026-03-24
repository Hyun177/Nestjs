import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto/create-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { Permission } from '../auth/permission/permissions.enum';

@ApiTags('Categories')
@Controller('category')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  // Public — anyone can browse categories on a shop
  @Get()
  @ApiOperation({ summary: 'Get all categories (public)' })
  async getCategories() {
    return await this.categoryService.getCategories();
  }

  // Write operations — requires login + permission
  @Post()
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.CATEGORY_CREATE)
  @ApiOperation({ summary: 'Create a category (admin/manager)' })
  async createCategory(@Body() data: CreateCategoryDto) {
    return await this.categoryService.createCategory(data);
  }

  @Put(':id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.CATEGORY_UPDATE)
  @ApiOperation({ summary: 'Update a category (admin/manager)' })
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Category>,
  ) {
    return await this.categoryService.updateCategory(id, data);
  }

  @Delete(':id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.CATEGORY_DELETE)
  @ApiOperation({ summary: 'Delete a category (admin/manager)' })
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    await this.categoryService.deleteCategory(id);
    return { message: 'Category deleted successfully' };
  }
}
