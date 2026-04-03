import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ShopCategoryService } from './shop-category.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('shop-category')
export class ShopCategoryController {
  constructor(private readonly shopCategoryService: ShopCategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('seller')
  create(@Request() req, @Body() createDto: any) {
    return this.shopCategoryService.create(req.user.id, createDto);
  }

  // Get categories for a specific shop (public accessible for buyers)
  @Get('shop/:shopId')
  findAllByShop(@Param('shopId') shopId: string) {
    return this.shopCategoryService.findAllByShop(+shopId);
  }

  // Get categories for the current seller's shop
  @Get('me')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('seller')
  findMyCategories(@Request() req) {
    return this.shopCategoryService.findAllBySeller(req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('seller')
  update(@Request() req, @Param('id') id: string, @Body() updateDto: any) {
    return this.shopCategoryService.update(req.user.id, +id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('seller')
  remove(@Request() req, @Param('id') id: string) {
    return this.shopCategoryService.remove(req.user.id, +id);
  }
}
