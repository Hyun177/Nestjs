import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { RequestWithUser } from '../common/types/request-with-user';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto/create-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { Permission } from '../auth/permission/permissions.enum';
import { RoleGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';

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

  // Admin: Get all categories (all sellers + system)
  @Get('admin/all')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.CATEGORY_READ)
  @ApiOperation({ summary: 'Get all categories (admin)' })
  async getAllCategoriesAdmin() {
    return await this.categoryService.getAllCategoriesAdmin();
  }

  // ── Seller endpoints (role-based) ──────────────

  // Seller: Get all their categories
  @Get('seller/me')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('seller')
  @ApiOperation({ summary: 'Get all categories for seller dropdown' })
  async getCategoriesForSeller(@Request() req: RequestWithUser) {
    return await this.categoryService.getSellerCategories(req.user.userId);
  }

  // Seller: Create a category
  @Post('seller')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('seller')
  @ApiOperation({ summary: 'Create a category (seller)' })
  async createCategoryBySeller(
    @Request() req: RequestWithUser,
    @Body() data: CreateCategoryDto,
  ) {
    return await this.categoryService.createCategory(data, req.user.userId);
  }

  // Seller: Update a category
  @Put('seller/:id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('seller')
  @ApiOperation({ summary: 'Update a category (seller)' })
  async updateCategoryBySeller(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Category>,
  ) {
    const cat = await this.categoryService.getCategoryById(id);
    const userId = req.user.userId;
    if (!cat || cat.userId !== userId)
      throw new UnauthorizedException('Chỉ được sửa danh mục của mình');
    return await this.categoryService.updateCategory(id, data);
  }

  // Seller: Delete a category
  @Delete('seller/:id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('seller')
  @ApiOperation({ summary: 'Delete a category (seller)' })
  async deleteCategoryBySeller(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const cat = await this.categoryService.getCategoryById(id);
    const userId = req.user.userId;
    if (!cat || cat.userId !== userId)
      throw new UnauthorizedException('Chỉ được xóa danh mục của mình');
    await this.categoryService.deleteCategory(id);
    return { message: 'Category deleted successfully' };
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

  @Put('approve/:id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.CATEGORY_UPDATE)
  @ApiOperation({ summary: 'Approve a category' })
  async approveCategory(@Param('id', ParseIntPipe) id: number) {
    return await this.categoryService.approveCategory(id);
  }
}
