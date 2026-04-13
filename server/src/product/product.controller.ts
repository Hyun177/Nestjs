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
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permission } from '../auth/permission/permissions.enum';
import type { RequestWithUser } from '../common/types/request-with-user';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('Products')
@Controller('product')
export class ProductController {
  constructor(
    private readonly ProductService: ProductService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.PRODUCT_CREATE)
  @ApiOperation({ summary: 'Create a product (admin/manager)' })
  @UseInterceptors(
    AnyFilesInterceptor({
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
    const mainFile = files.find((f) => f.fieldname === 'image');
    const galleryFiles = files.filter((f) => f.fieldname === 'images');

    // Upload main image to Cloudinary
    if (mainFile) {
      const uploadResult = await this.cloudinaryService.uploadFile(mainFile);
      body.image = uploadResult.secure_url;
    }

    // Upload gallery images to Cloudinary
    if (galleryFiles.length > 0) {
      const galleryUrls = await Promise.all(
        galleryFiles.map(async (file) => {
          const res = await this.cloudinaryService.uploadFile(file);
          return res.secure_url;
        }),
      );
      body.images = galleryUrls;
    }

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
    @Query('showAll') showAll?: string,
    @Query('onSale') onSale?: string,
    @Query('newArrival') newArrival?: string,
    @Query('userId') userId?: string,
    @Query('sellerId') sellerId?: string,
    @Query('shopId') shopId?: string,
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const normalizedSort =
      sort === 'newest' || sort === 'price_asc' || sort === 'price_desc'
        ? sort
        : undefined;

    return this.ProductService.getProducts({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
      search,
      categoryId: categoryId ? Number(categoryId) : undefined,
      brandId: brandId ? Number(brandId) : undefined,
      sort: normalizedSort,
      color: color || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      showAll: showAll === 'true',
      onSale: onSale === 'true',
      newArrival: newArrival === 'true',
      userId: userId ? Number(userId) : undefined,
      sellerId: sellerId ? Number(sellerId) : undefined,
      shopId: shopId ? Number(shopId) : undefined,
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

  // ---- Archive specific endpoints ----
  @Put('seller/:id/archive')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Toggle archive status (seller)' })
  async toggleArchiveSeller(
    @Param('id', ParseIntPipe) id: number,
    @Body('isArchived') isArchived: boolean,
    @Req() req: RequestWithUser,
  ) {
    const prod = await this.ProductService.getProductById(id);
    if (!prod) throw new NotFoundException('Sản phẩm không tồnại');
    const userId = req.user.userId;
    if (prod.userId !== userId)
      throw new UnauthorizedException('Không có quyền ẩn sản phẩm này');

    return this.ProductService.updateProduct(id, { isArchived });
  }

  @Put(':id/archive')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.PRODUCT_UPDATE)
  @ApiOperation({ summary: 'Toggle archive status (admin)' })
  async toggleArchiveAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body('isArchived') isArchived: boolean,
  ) {
    return this.ProductService.updateProduct(id, { isArchived });
  }
  // ------------------------------------

  @Put(':id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.PRODUCT_UPDATE)
  @ApiOperation({ summary: 'Update a product (admin/manager)' })
  @UseInterceptors(
    AnyFilesInterceptor({
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
    @Body() body: Partial<UpdateProductDto>,
  ) {
    const mainFile = files?.find((f) => f.fieldname === 'image');
    const galleryFiles = files?.filter((f) => f.fieldname === 'images') || [];

    // If a new main image was uploaded, upload to Cloudinary.
    if (mainFile) {
      const uploadResult = await this.cloudinaryService.uploadFile(mainFile);
      body.image = uploadResult.secure_url;
    }

    // Handle gallery images
    let finalGallery: string[] = [];

    // 1. Get existing images paths sent from frontend
    if (body.existingImages !== undefined) {
      if (typeof body.existingImages === 'string') {
        try {
          const parsed = JSON.parse(body.existingImages);
          finalGallery = Array.isArray(parsed) ? parsed : [];
        } catch {
          finalGallery = [];
        }
      } else if (Array.isArray(body.existingImages)) {
        finalGallery = body.existingImages;
      }
    }

    // 2. Add new uploaded gallery files to Cloudinary
    if (galleryFiles.length > 0) {
      const newUrls = await Promise.all(
        galleryFiles.map(async (file) => {
          const res = await this.cloudinaryService.uploadFile(file);
          return res.secure_url;
        }),
      );
      finalGallery = [...finalGallery, ...newUrls];
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
