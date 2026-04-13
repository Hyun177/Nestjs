import { PostsService } from './posts.service';
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
} from '@nestjs/common';
import { Posts } from './entities/post.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { UserPayload } from '../users/types/user-payload.type';
import { CurrentUser } from '../decorators/current-user.decorator';
import { PostDto } from './dto/post.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PostOwnershipGuard } from './guards/post-ownership.guard';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { Permission } from '../auth/permission/permissions.enum';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly PostsService: PostsService) {}

  // Public — anyone can read posts
  @Get()
  @ApiOperation({ summary: 'Get all posts (public)' })
  async getPosts(): Promise<Posts[]> {
    return this.PostsService.getPosts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by id (public)' })
  async getPostById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Posts | null> {
    return this.PostsService.getPostById(id);
  }

  // Tạo post — phải đăng nhập + có permission post:create
  @Post()
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.POST_CREATE)
  @ApiOperation({ summary: 'Create a post (customer/manager/admin)' })
  async createPost(
    @Body() dto: PostDto,
    @CurrentUser() user: UserPayload,
  ): Promise<Posts> {
    return this.PostsService.createPost(dto, user.userId);
  }

  // Sửa — phải là owner (PostOwnershipGuard) + có permission post:update
  @Put(':id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard, PostOwnershipGuard)
  @Permissions(Permission.POST_UPDATE)
  @ApiOperation({ summary: 'Update own post (owner / admin)' })
  async updatePost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PostDto,
  ): Promise<Posts> {
    return this.PostsService.updatePost(id, dto);
  }

  // Xoá — phải là owner (PostOwnershipGuard) + có permission post:delete
  @Delete(':id')
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, PermissionGuard, PostOwnershipGuard)
  @Permissions(Permission.POST_DELETE)
  @ApiOperation({ summary: 'Delete own post (owner / admin)' })
  async deletePost(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.PostsService.deletePost(id);
  }
}
