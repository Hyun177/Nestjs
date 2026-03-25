import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { Role } from '../users/entities/role.entity';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    private jwtService: JwtService,
  ) {}
  async register(data: RegisterDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { email: data.email } });
    if (user) {
      throw new ConflictException('User already exists');
    }

    // Tìm role 'user' mặc định
    let defaultRole = await this.roleRepo.findOne({ where: { name: 'user' } });
    if (!defaultRole) {
      // Nếu chưa có trong DB thì tạo mới (tùy logic, thường nên có sẵn)
      defaultRole = this.roleRepo.create({ name: 'user' });
      await this.roleRepo.save(defaultRole);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const newUser = this.userRepo.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      roles: [defaultRole], // Gán role mặc định ở đây
    });
    return await this.userRepo.save(newUser);
  }
  async login(data: RegisterDto): Promise<LoginDto> {
    const user = await this.userRepo.findOne({
      where: { email: data.email },
      relations: ['roles'],
    });
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
      roles: user.roles?.map((r) => r.name) || ['user'],
    };
    if (payload.roles.length === 0) payload.roles = ['user'];
    
    const access_token = this.jwtService.sign(
      { ...payload, type: 'access' },
      { expiresIn: '30d' }
    );

    const refresh_token = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: '90d' }
    );
    const hashedRt = await bcrypt.hash(refresh_token, 10);
    user.refreshToken = hashedRt;
    await this.userRepo.save(user);
    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles?.map((r) => r.name) || ['user'],
      },
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
