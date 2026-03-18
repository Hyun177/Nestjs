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
} from '@nestjs/common';
@Controller('users')
export class UsersController {
  constructor(private readonly UsersService: UsersService) {}
  @Get()
  async getAllUsers(): Promise<User[]> {
    return this.UsersService.getUsers();
  }
  @Post()
  async createUser(@Body() body: CreateUserDto): Promise<User> {
    return this.UsersService.createUser(body);
  }
  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<User> {
    return this.UsersService.getUserById(Number(id));
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string): Promise<User> {
    return this.UsersService.deleteUser(Number(id));
  }
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ): Promise<User> {
    return this.UsersService.updateUser(Number(id), body);
  }
}
