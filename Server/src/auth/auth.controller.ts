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
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginInputDto } from './dto/login-input.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from '../common/types/request-with-user';
import { RoleGuard } from './role.guard';
import { GoogleLoginDto } from './dto/google-login.dto';
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
  async getProfile(@Req() req: RequestWithUser): Promise<User> {
    console.log('User from token:', req.user);
    return this.authService.getProfile(req.user.userId);
  }
  @UseGuards(RoleGuard)
  @Post('login')
  async login(@Body() body: LoginInputDto): Promise<LoginDto> {
    return await this.authService.login(body);
  }

  // SPA Google sign-in: frontend sends Google ID token (credential)
  @Post('google')
  async googleLogin(@Body() body: GoogleLoginDto): Promise<LoginDto> {
    return await this.authService.loginWithGoogle(body.credential);
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
