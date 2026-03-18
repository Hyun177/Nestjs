import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { Repository } from 'typeorm/repository/Repository.js';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}
  async register(data: RegisterDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { email: data.email } });
    if (user) {
      throw new ConflictException('User already exists');
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const newUser = this.userRepo.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
    });
    return await this.userRepo.save(newUser);
  }
  async login(data: RegisterDto): Promise<LoginDto> {
    const user = await this.userRepo.findOne({ where: { email: data.email } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const access_token = this.jwtService.sign({
      ...payload,
      type: 'access',
      expiresIn: '1h',
    });

    const refresh_token = this.jwtService.sign({
      ...payload,
      type: 'refresh',
      expiresIn: '30d',
    });
    const hashedRt = await bcrypt.hash(refresh_token, 10);
    user.refreshToken = hashedRt;
    await this.userRepo.save(user);
    return {
      access_token,
      refresh_token,
    };
  }
  async changePassword(userId: number, newPassword: string): Promise<User> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    return await this.userRepo.save(user);
  }
  async getProfile(userId: number): Promise<User> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    console.log('DB user:', user);
    return user;
  }
}
