import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './types/users.type';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

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
    return await this.userRepo.find();
  }
  async getUserById(id: number): Promise<User> {
    const user = await this.userRepo.findOneBy({ id });
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
}
