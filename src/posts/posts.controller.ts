import { PostsService } from './posts.service';
import {
  Body,
  Controller,
  Post,
  Put,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { Posts } from './entities/post.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { UserPayload } from 'src/users/types/user-payload.type';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { PostDto } from './dto/post.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PostOwnershipGuard } from './guards/post-ownership.guard';
@Controller('posts')
@ApiBearerAuth('accessToken')
export class PostsController {
  constructor(private readonly PostsService: PostsService) {}
  @Post()
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard)
  async createPost(
    @Body() dto: PostDto,
    @CurrentUser() user: UserPayload,
  ): Promise<Posts> {
    return this.PostsService.createPost(dto, user.userId);
  }
  @Put(':id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PostOwnershipGuard)
  async updatePost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PostDto,
  ): Promise<Posts> {
    return this.PostsService.updatePost(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PostOwnershipGuard)
  async deletePost(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.PostsService.deletePost(id);
  }
}
