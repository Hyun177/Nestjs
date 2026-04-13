import { ChangePasswordDto } from './dto/change-password.dto';
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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { Permission } from '../auth/permission/permissions.enum';
import type { RequestWithUser } from './types/user-payload.type';

import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth('accessToken')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UsersController {
  constructor(
    private readonly UsersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req: RequestWithUser): Promise<Partial<User>> {
    return this.UsersService.getUserById(req.user.userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body() body: UpdateUserDto,
  ): Promise<Partial<User>> {
    return this.UsersService.updateUser(req.user.userId, body);
  }

  @Post('profile/avatar')
  @ApiOperation({ summary: 'Update current user avatar' })
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed!'), false);
      },
    }),
  )
  async updateAvatar(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) return { message: 'No file uploaded' };
    const uploadResult = await this.cloudinaryService.uploadFile(file);
    return this.UsersService.updateUser(req.user.userId, {
      avatar: uploadResult.secure_url,
    });
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @Req() req: RequestWithUser,
    @Body() body: ChangePasswordDto,
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
