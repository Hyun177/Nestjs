import { AuthService } from './auth.service';
import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  Req,
} from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/common/types/request-with-user';
import { RoleGuard } from './role.guard';
import { Roles } from './decorators/roles.decorator';
@Controller('auth')
@ApiBearerAuth('accessToken')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto): Promise<User> {
    return await this.authService.register(body);
  }

  @ApiBearerAuth('accessToken')
  @Get('profile')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  // Dùng @Request() req: RequestWithUser thay vì @Body() hoặc any
  async getProfile(@Req() req: RequestWithUser): Promise<User> {
    console.log('User from token:', req.user);
    // Truy cập req.user.userId (đã được định nghĩa trong interface)
    return this.authService.getProfile(req.user.userId);
  }
  @UseGuards(RoleGuard)
  @Post('login')
  async login(@Body() body: RegisterDto): Promise<LoginDto> {
    return await this.authService.login(body);
  }
  @UseGuards(RoleGuard)
  @Put('change-password')
  async changePassword(
    @Body('userId') userId: number,
    @Body('newPassword') newPassword: string,
  ): Promise<User> {
    return await this.authService.changePassword(userId, newPassword);
  }
}
