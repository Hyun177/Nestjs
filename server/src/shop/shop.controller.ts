import { Controller, Get, Patch, Body, UseGuards, Request, Param, Post, UploadedFile, UseInterceptors, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ShopService } from './shop.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) { }

  @Get('me')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('seller')
  findMyShop(@Request() req) {
    return this.shopService.findBySeller(req.user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('seller')
  update(@Request() req, @Body() updateDto: any) {
    return this.shopService.update(req.user.id, updateDto);
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
  follow(@Request() req, @Param('sellerId') sellerId: string) {
    return this.shopService.follow(req.user.userId, +sellerId);
  }

  @Get('is-following/:sellerId')
  @UseGuards(JwtAuthGuard)
  async checkFollowing(@Request() req, @Param('sellerId') sellerId: string) {
    const isFollowing = await this.shopService.isFollowing(req.user.userId, +sellerId);
    return { isFollowing };
  }

  @Post(':id/logo')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'manager', 'seller')
  @UseInterceptors(FileInterceptor('logo', {
    storage: diskStorage({
      destination: './uploads/shops',
      filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `logo-${uniqueName}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const logoUrl = `/uploads/shops/${file.filename}`;
    return this.shopService.updateById(+id, { logo: logoUrl });
  }

  @Post(':id/cover')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'manager', 'seller')
  @UseInterceptors(FileInterceptor('cover', {
    storage: diskStorage({
      destination: './uploads/shops',
      filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `cover-${uniqueName}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadCover(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const coverUrl = `/uploads/shops/${file.filename}`;
    return this.shopService.updateById(+id, { coverImage: coverUrl });
  }

  @Get('stats/:sellerId')
  getStats(@Param('sellerId') sellerId: string) {
    return this.shopService.getShopStats(+sellerId);
  }
}
