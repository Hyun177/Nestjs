import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ShopService } from './shop.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';
import type { RequestWithUser } from '../users/types/user-payload.type';

import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('shop')
export class ShopController {
  constructor(
    private readonly shopService: ShopService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('seller')
  findMyShop(@Request() req: RequestWithUser) {
    return this.shopService.findBySeller(req.user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('seller')
  update(@Request() req: RequestWithUser, @Body() updateDto: any) {
    return this.shopService.update(req.user.userId, updateDto);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.shopService.searchShops(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shopService.findById(+id);
  }

  @Get('seller/:sellerId')
  findBySeller(@Param('sellerId') sellerId: string) {
    return this.shopService.findBySeller(+sellerId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'manager')
  updateById(@Param('id') id: string, @Body() updateDto: any) {
    return this.shopService.updateById(+id, updateDto);
  }

  @Post('follow/:sellerId')
  @UseGuards(JwtAuthGuard)
  follow(@Request() req: RequestWithUser, @Param('sellerId') sellerId: string) {
    return this.shopService.follow(req.user.userId, +sellerId);
  }

  @Get('is-following/:sellerId')
  @UseGuards(JwtAuthGuard)
  async checkFollowing(
    @Request() req: RequestWithUser,
    @Param('sellerId') sellerId: string,
  ) {
    const isFollowing = await this.shopService.isFollowing(
      req.user.userId,
      +sellerId,
    );
    return { isFollowing };
  }

  @Post(':id/logo')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'manager', 'seller')
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed!'), false);
      },
    }),
  )
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) return { message: 'No file uploaded' };
    const uploadResult = await this.cloudinaryService.uploadFile(file);
    return this.shopService.updateById(+id, { logo: uploadResult.secure_url });
  }

  @Post(':id/cover')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'manager', 'seller')
  @UseInterceptors(
    FileInterceptor('cover', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed!'), false);
      },
    }),
  )
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) return { message: 'No file uploaded' };
    const uploadResult = await this.cloudinaryService.uploadFile(file);
    return this.shopService.updateById(+id, {
      coverImage: uploadResult.secure_url,
    });
  }

  @Get('stats/:sellerId')
  getStats(@Param('sellerId') sellerId: string) {
    return this.shopService.getShopStats(+sellerId);
  }
}
