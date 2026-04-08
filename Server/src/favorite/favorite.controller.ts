import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/users/types/user-payload.type';

@ApiTags('Favorite')
@ApiBearerAuth()
@Controller('favorite')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post(':productId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Toggle favorite status for a product' })
  async toggle(
    @Param('productId') productId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.favoriteService.toggleFavorite(req.user.userId, productId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all favorite products for current user' })
  async getFavorites(@Req() req: RequestWithUser) {
    return this.favoriteService.getFavorites(req.user.userId);
  }

  @Get(':productId/check')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if a product is in user favorites' })
  async check(
    @Param('productId') productId: number,
    @Req() req: RequestWithUser,
  ) {
    const isFav = await this.favoriteService.isFavorite(
      req.user.userId,
      productId,
    );
    return { isFavorite: isFav };
  }
}
