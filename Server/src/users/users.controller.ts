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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
