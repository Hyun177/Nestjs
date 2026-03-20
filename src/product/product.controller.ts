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
import { ApiBearerAuth } from '@nestjs/swagger';
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

@Controller('product')
@ApiBearerAuth('accessToken')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private readonly ProductService: ProductService) {}

  @Post()
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
  @Permissions('product:create')
  @UseGuards(PermissionGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'number' },
        description: { type: 'string' },
        category: { type: 'string' },
        brand: { type: 'string' },
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
    if (imageUrl) {
      body.image = imageUrl;
    }
    return this.ProductService.createProduct(
      { ...body, image: imageUrl },
      req.user.userId,
    );
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
