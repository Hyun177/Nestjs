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
  Req,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Permissions } from 'src/auth/permission/permissions.decorator';
import { PermissionGuard } from 'src/auth/permission/permission.guard';
import { Permission } from 'src/auth/permission/permissions.enum';
import type { RequestWithUser } from 'src/common/types/request-with-user';

@Controller('product')
@ApiBearerAuth('accessToken')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private readonly ProductService: ProductService) {}

  @Post()
  @Permissions(Permission.PRODUCT_CREATE)
  @UseGuards(PermissionGuard)
  async createProduct(
    @Body() body: CreateProductDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ProductService.createProduct(body, req.user.userId);
  }

  @Get()
  @Permissions(Permission.PRODUCT_READ)
  @UseGuards(PermissionGuard)
  async getProducts() {
    return this.ProductService.getProducts();
  }

  @Get(':id')
  @Permissions(Permission.PRODUCT_READ)
  @UseGuards(PermissionGuard)
  async getProductById(@Param('id', ParseIntPipe) id: number) {
    return this.ProductService.getProductById(id);
  }

  @Put(':id')
  @Permissions(Permission.PRODUCT_UPDATE)
  @UseGuards(PermissionGuard)
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductDto,
  ) {
    return this.ProductService.updateProduct(id, body);
  }

  @Delete(':id')
  @Permissions(Permission.PRODUCT_DELETE)
  @UseGuards(PermissionGuard)
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.ProductService.deleteProduct(id);
  }
}
