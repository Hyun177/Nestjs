import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginInputDto } from './dto/login-input.dto';
import { InjectRepository } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { Role } from '../users/entities/role.entity';
import { VoucherService } from '../voucher/voucher.service';
import { OAuth2Client } from 'google-auth-library';
@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    private jwtService: JwtService,
    private voucherService: VoucherService,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    this.googleClient = new OAuth2Client(clientId);
  }
  async register(data: RegisterDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { email: data.email } });
    if (user) {
      throw new ConflictException('User already exists');
    }
    let defaultRole = await this.roleRepo.findOne({ where: { name: 'user' } });
    if (!defaultRole) {
      defaultRole = this.roleRepo.create({ name: 'user' });
      await this.roleRepo.save(defaultRole);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const newUser = this.userRepo.create({
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      password: hashedPassword,
      roles: [defaultRole],
    });
    const savedUser = await this.userRepo.save(newUser);
    await this.voucherService
      .assignWelcomeVoucher(savedUser.id)
      .catch(() => {});

    return savedUser;
  }
  async login(data: LoginInputDto): Promise<LoginDto> {
    const user = await this.userRepo.findOne({
      where: { email: data.email },
      relations: ['roles'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status === 'blocked') {
      throw new UnauthorizedException('Tài khoản đã bị chặn');
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
      { expiresIn: '30d' },
    );

    const refresh_token = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: '90d' },
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
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        avatar: user.avatar,
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

  async loginWithGoogle(credential: string): Promise<LoginDto> {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new UnauthorizedException('Google login is not configured');
    }
    if (!credential) {
      throw new UnauthorizedException('Missing Google credential');
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    let user = await this.userRepo.findOne({
      where: { email: payload.email },
      relations: ['roles'],
    });

    // Ensure default role exists
    let defaultRole = await this.roleRepo.findOne({ where: { name: 'user' } });
    if (!defaultRole) {
      defaultRole = this.roleRepo.create({ name: 'user' });
      await this.roleRepo.save(defaultRole);
    }

    if (!user) {
      // Create user with a random password (not used for Google login)
      const randomPassword = await bcrypt.hash(
        `${payload.sub || payload.email}-${Date.now()}`,
        10,
      );
      user = this.userRepo.create({
        email: payload.email,
        password: randomPassword,
        firstname: payload.given_name || '',
        lastname: payload.family_name || '',
        name: payload.name || '',
        avatar: payload.picture || '',
        roles: [defaultRole],
      });
      user = await this.userRepo.save(user);
      await this.voucherService.assignWelcomeVoucher(user.id).catch(() => {});
      user.roles = [defaultRole];
    } else {
      // If user exists, update avatar and names if they are empty
      let changed = false;
      if (!user.avatar && payload.picture) {
        user.avatar = payload.picture;
        changed = true;
      }
      if (!user.firstname && payload.given_name) {
        user.firstname = payload.given_name;
        changed = true;
      }
      if (!user.lastname && payload.family_name) {
        user.lastname = payload.family_name;
        changed = true;
      }
      if (!user.roles || user.roles.length === 0) {
        user.roles = [defaultRole];
        changed = true;
      }
      if (changed) await this.userRepo.save(user);
    }

    const jwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles?.map((r) => r.name) || ['user'],
    };
    const access_token = this.jwtService.sign(
      { ...jwtPayload, type: 'access' },
      { expiresIn: '30d' },
    );
    const refresh_token = this.jwtService.sign(
      { ...jwtPayload, type: 'refresh' },
      { expiresIn: '90d' },
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
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        avatar: user.avatar,
        roles: user.roles?.map((r) => r.name) || ['user'],
      },
    };
  }
}
