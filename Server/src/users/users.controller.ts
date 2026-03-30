import { UpdateUserDto } from './dto/update-user.dto';
import type { User } from './types/users.type';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Put,
  Patch,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { Permission } from '../auth/permission/permissions.enum';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth('accessToken')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly UsersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req): Promise<Partial<User>> {
    return this.UsersService.getUserById(req.user.userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @Req() req,
    @Body() body: UpdateUserDto,
  ): Promise<Partial<User>> {
    return this.UsersService.updateUser(req.user.userId, body);
  }

  @Post('profile/avatar')
  @ApiOperation({ summary: 'Update current user avatar' })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueName}${ext}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed!'), false);
      },
    }),
  )
  async updateAvatar(@Req() req, @UploadedFile() file: Express.Multer.File) {
    const avatarUrl = file ? `/uploads/avatars/${file.filename}` : undefined;
    if (!avatarUrl) return { message: 'No file uploaded' };
    return this.UsersService.updateUser(req.user.userId, { avatar: avatarUrl });
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @Req() req,
    @Body() body: any, // Should use a proper DTO, maybe {oldPassword, newPassword}
  ): Promise<any> {
    // We will implement this in the service
    return this.UsersService.changePassword(
      req.user.userId,
      body.oldPassword,
      body.newPassword,
    );
  }

  @Get()
  @Permissions(Permission.USER_READ)
  @ApiOperation({ summary: 'Get all users (admin/manager)' })
  async getAllUsers(): Promise<Partial<User>[]> {
    return this.UsersService.getUsers();
  }

  @Get(':id')
  @Permissions(Permission.USER_READ)
  @ApiOperation({ summary: 'Get user by id (admin/manager)' })
  async getUserById(@Param('id') id: string): Promise<Partial<User>> {
    return this.UsersService.getUserById(Number(id));
  }

  @Post()
  @Permissions(Permission.USER_CREATE)
  @ApiOperation({ summary: 'Create a user (admin only)' })
  async createUser(@Body() body: CreateUserDto): Promise<Partial<User>> {
    return this.UsersService.createUser(body);
  }

  @Put(':id')
  @Permissions(Permission.USER_UPDATE)
  @ApiOperation({ summary: 'Update a user (admin only)' })
  async updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ): Promise<Partial<User>> {
    return this.UsersService.updateUser(Number(id), body);
  }

  @Delete(':id')
  @Permissions(Permission.USER_DELETE)
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  async deleteUser(@Param('id') id: string): Promise<Partial<User>> {
    return this.UsersService.deleteUser(Number(id));
  }
}
