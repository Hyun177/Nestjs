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
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto/create-brand.dto';
import { Brand } from './entities/brand.entity/brand.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { Permission } from '../auth/permission/permissions.enum';

@ApiTags('Brands')
@Controller('brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  // Public — anyone can browse brands
  @Get()
  @ApiOperation({ summary: 'Get all brands (public)' })
  async getBrands() {
    return await this.brandService.getBrands();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand by id (public)' })
  async getBrandById(@Param('id', ParseIntPipe) id: number) {
    return await this.brandService.getBrandById(id);
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
}
