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
  Query,
} from '@nestjs/common';
import type { RequestWithUser } from '../common/types/request-with-user';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto/create-brand.dto';
import { Brand } from './entities/brand.entity/brand.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { Permission } from '../auth/permission/permissions.enum';
import { RoleGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';

@ApiTags('Brands')
@Controller('brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  // Admin: Get ALL brands (system + seller) for dashboard
  @Get('admin/all')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.BRAND_READ)
  @ApiOperation({ summary: 'Get all brands for admin dashboard' })
  async getAllBrands() {
    return await this.brandService.getAllBrandsAdmin();
  }

  // Public — anyone can browse brands (Offical system brands only)
  @Get()
  @ApiOperation({ summary: 'Get all brands (public)' })
  async getBrands(@Query('categoryId') categoryId?: number) {
    return await this.brandService.getBrands(
      categoryId ? Number(categoryId) : undefined,
    );
  }

  @Get('premium/featured')
  @ApiOperation({ summary: 'Get all starred brands (public marquee)' })
  async getPremiumBrands() {
    return await this.brandService.getPremiumBrands();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand by id (public)' })
  async getBrandById(@Param('id', ParseIntPipe) id: number) {
    return await this.brandService.getBrandById(id);
  }

  // ── Seller endpoints (role-based, not permission-based) ──────────────

  // Seller: Get all brands (public brands, for use in product upload)
  @Get('seller/me')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('seller')
  @ApiOperation({ summary: 'Get all brands for seller dropdown' })
  async getBrandsForSeller(
    @Request() req: RequestWithUser,
    @Query('categoryId') categoryId?: string,
  ) {
    return await this.brandService.getSellerBrands(
      req.user.userId,
      categoryId ? Number(categoryId) : undefined,
    );
  }

  // Seller: Create a brand
  @Post('seller')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('seller')
  @ApiOperation({ summary: 'Create a brand (seller)' })
  async createBrandBySeller(
    @Request() req: RequestWithUser,
    @Body() data: CreateBrandDto,
  ) {
    return await this.brandService.createBrand(data, req.user.userId);
  }

  // Write operations — requires login + permission
  @Post()
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.BRAND_CREATE)
  @ApiOperation({ summary: 'Create a brand (admin/manager)' })
  async createBrand(@Body() data: CreateBrandDto) {
    return await this.brandService.createBrand(data);
  }

  @Put(':id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.BRAND_UPDATE)
  @ApiOperation({ summary: 'Update a brand (admin/manager)' })
  async updateBrand(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Brand>,
  ) {
    return await this.brandService.updateBrand(id, data);
  }

  @Delete(':id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.BRAND_DELETE)
  @ApiOperation({ summary: 'Delete a brand (admin/manager)' })
  async deleteBrand(@Param('id', ParseIntPipe) id: number) {
    await this.brandService.deleteBrand(id);
    return { message: 'Brand deleted successfully' };
  }

  @Put('approve/:id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.BRAND_UPDATE)
  @ApiOperation({ summary: 'Approve a brand' })
  async approveBrand(@Param('id', ParseIntPipe) id: number) {
    return await this.brandService.approveBrand(id);
  }
}
