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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permission } from '../auth/permission/permissions.enum';
import type { RequestWithUser } from '../common/types/request-with-user';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Products')
@Controller('product')
export class ProductController {
  constructor(private readonly ProductService: ProductService) {}

  @Post()
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.PRODUCT_CREATE)
  @ApiOperation({ summary: 'Create a product (admin/manager)' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueName}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed!'), false);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'number' },
        description: { type: 'string' },
        categoryId: { type: 'number' },
        brandId: { type: 'number' },
        stock: { type: 'number' },
        rating: { type: 'number' },
        numReviews: { type: 'number' },
        isFeatured: { type: 'boolean' },
        isArchived: { type: 'boolean' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  async createProduct(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateProductDto,
    @Req() req: RequestWithUser,
  ) {
    const imageUrl = file ? `/uploads/${file.filename}` : undefined;
    if (imageUrl) body.image = imageUrl;
    return this.ProductService.createProduct({ ...body, image: imageUrl }, req.user.userId);
  }

  // Public — shoppers can browse products without logging in
  @Get()
  @ApiOperation({ summary: 'Get all products (public)' })
  async getProducts() {
    return this.ProductService.getProducts();
  }

  @Get('top-selling')
  @ApiOperation({ summary: 'Get top selling products (public)' })
  async getTopSelling() {
    return this.ProductService.getTopSelling();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by id (public)' })
  async getProductById(@Param('id', ParseIntPipe) id: number) {
    return this.ProductService.getProductById(id);
  }

  @Put(':id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.PRODUCT_UPDATE)
  @ApiOperation({ summary: 'Update a product (admin/manager)' })
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductDto,
  ) {
    return this.ProductService.updateProduct(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.PRODUCT_DELETE)
  @ApiOperation({ summary: 'Delete a product (admin/manager)' })
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.ProductService.deleteProduct(id);
  }
}
