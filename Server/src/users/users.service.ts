import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './types/users.type';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}
  async createUser(data: CreateUserDto): Promise<User> {
    const newUser = this.userRepo.create(data);
    return await this.userRepo.save(newUser);
  }
  async getUsers(): Promise<User[]> {
    return await this.userRepo.find({ relations: ['roles', 'orders'] });
  }
  async getUserById(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ 
      where: { id },
      relations: ['roles'] 
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
  async deleteUser(id: number): Promise<User> {
    const user = await this.getUserById(id);
    await this.userRepo.delete(user);
    return user;
  }
  async updateUser(id: number, data: Partial<CreateUserDto>): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    Object.assign(user, data);
    return await this.userRepo.save(user);
  }

  async changePassword(id: number, oldPass: string, newPass: string): Promise<User> {
    const user = await this.getUserById(id);
    const isPasswordValid = await bcrypt.compare(oldPass, user.password);
    if (!isPasswordValid) {
       throw new Error('Invalid old password');
    }
    user.password = await bcrypt.hash(newPass, 10);
    return await this.userRepo.save(user);
  }
}
