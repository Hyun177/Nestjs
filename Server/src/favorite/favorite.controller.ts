import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Favorite')
@ApiBearerAuth()
@Controller('favorite')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post(':productId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Toggle favorite status for a product' })
  async toggle(@Param('productId') productId: number, @Req() req: any) {
    return this.favoriteService.toggleFavorite(req.user.id, productId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all favorite products for current user' })
  async getFavorites(@Req() req: any) {
    return this.favoriteService.getFavorites(req.user.id);
  }

  @Get(':productId/check')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if a product is in user favorites' })
  async check(@Param('productId') productId: number, @Req() req: any) {
    const isFav = await this.favoriteService.isFavorite(req.user.id, productId);
    return { isFavorite: isFav };
  }
}
