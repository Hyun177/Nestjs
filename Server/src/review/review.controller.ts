import {
  Controller, Post, Get, Patch, Delete, Body, Param,
  UseGuards, Req, ParseIntPipe, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

const imageUploadInterceptor = FileInterceptor('image', {
  storage: diskStorage({
    destination: './uploads/reviews',
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueName}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed!'), false);
  },
});

@ApiTags('review')
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @UseInterceptors(imageUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  async createReview(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('productId', ParseIntPipe) productId: number,
    @Body('rating', ParseIntPipe) rating: number,
    @Body('comment') comment: string,
    @Body('orderId') orderId?: string,
  ) {
    const imageUrl = file ? `/uploads/reviews/${file.filename}` : undefined;
    const numericOrderId = orderId ? parseInt(orderId, 10) : undefined;
    return this.reviewService.createOrUpdateReview(req.user.userId, productId, rating, comment, imageUrl, numericOrderId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  @UseInterceptors(imageUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  async updateReview(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('rating', ParseIntPipe) rating: number,
    @Body('comment') comment: string,
  ) {
    const imageUrl = file ? `/uploads/reviews/${file.filename}` : undefined;
    return this.reviewService.updateReview(id, req.user.userId, rating, comment, imageUrl);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  async deleteReview(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.reviewService.deleteReview(id, req.user.userId);
  }

  @Get('product/:productId')
  async getProductReviews(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewService.getProductReviews(productId);
  }

  @Get('my/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  async getMyReview(@Req() req: any, @Param('productId', ParseIntPipe) productId: number) {
    return this.reviewService.getMyReview(req.user.userId, productId);
  }

  @Get('can-review/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('accessToken')
  async canReview(@Req() req: any, @Param('productId', ParseIntPipe) productId: number) {
    return this.reviewService.canUserReview(req.user.userId, productId);
  }
}
