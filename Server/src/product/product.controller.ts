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
  UploadedFiles,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permission } from '../auth/permission/permissions.enum';
import type { RequestWithUser } from '../common/types/request-with-user';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
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
    AnyFilesInterceptor({
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
        image: { type: 'string', format: 'binary', description: 'Main Image' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Gallery Images',
        },
      },
    },
  })
  async createProduct(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: CreateProductDto,
    @Req() req: RequestWithUser,
  ) {
    // Separate main image from gallery
    const mainFile = files.find(f => f.fieldname === 'image');
    const galleryFiles = files.filter(f => f.fieldname === 'images');

    const imageUrl = mainFile ? `/uploads/${mainFile.filename}` : undefined;
    const galleryUrls = galleryFiles.map(f => `/uploads/${f.filename}`);

    if (imageUrl) body.image = imageUrl;
    if (galleryUrls.length > 0) body.images = galleryUrls;

    return this.ProductService.createProduct(body, req.user.userId);
  }

  // Public — shoppers can browse products without logging in
  @Get()
  @ApiOperation({ summary: 'Get all products (public)' })
  async getProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('sort') sort?: string,
    @Query('color') color?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.ProductService.getProducts({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search,
      categoryId: categoryId ? Number(categoryId) : undefined,
      brandId: brandId ? Number(brandId) : undefined,
      sort,
      color: color || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
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
  @UseInterceptors(
    AnyFilesInterceptor({
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
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any, // Use any to handle stringified JSON fields
  ) {
    const mainFile = files?.find(f => f.fieldname === 'image');
    const galleryFiles = files?.filter(f => f.fieldname === 'images') || [];
    
    // If a new main image was uploaded, use it. 
    // Otherwise, body.image might already contain the existing path sent from frontend.
    if (mainFile) {
      body.image = `/uploads/${mainFile.filename}`;
    }

    // Handle gallery images
    let finalGallery: string[] = [];
    
    // 1. Get existing images paths sent from frontend
    if (body.existingImages) {
      try {
        finalGallery = typeof body.existingImages === 'string' 
          ? JSON.parse(body.existingImages) 
          : body.existingImages;
      } catch (e) {
        finalGallery = [];
      }
    }

    // 2. Add new uploaded gallery files
    if (galleryFiles.length > 0) {
      const newFiles = galleryFiles.map(f => `/uploads/${f.filename}`);
      finalGallery = [...finalGallery, ...newFiles];
    }

    // Assign back to body.images for the service to handle
    if (finalGallery.length > 0 || body.existingImages) {
      body.images = finalGallery;
    }

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
