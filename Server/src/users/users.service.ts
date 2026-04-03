import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './types/users.type';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
  ) {}
  async createUser(data: CreateUserDto): Promise<User> {
    const { role, password, ...rest } = data;
    const newUser = this.userRepo.create(rest as Partial<User>);

    if (password) {
      newUser.password = await bcrypt.hash(password, 10);
    }

    if (role) {
      const roleEntity = await this.roleRepo.findOne({
        where: [
          { name: role.toLowerCase() },
          { name: role.toUpperCase() },
          { name: role },
        ],
      });
      if (roleEntity) {
        newUser.roles = [roleEntity];
      }
    }

    return await this.userRepo.save(newUser);
  }
  async getUsers(): Promise<User[]> {
    return await this.userRepo.find({ relations: ['roles', 'orders', 'shop'] });
  }
  async getUserById(id: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['roles'],
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

    const { role, password, ...rest } = data;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    if (role) {
      const roleEntity = await this.roleRepo.findOne({
        where: [
          { name: role.toLowerCase() },
          { name: role.toUpperCase() },
          { name: role },
        ],
      });
      if (roleEntity) {
        user.roles = [roleEntity];
      }
    }

    Object.assign(user, rest);
    return await this.userRepo.save(user);
  }

  async changePassword(
    id: number,
    oldPass: string,
    newPass: string,
  ): Promise<User> {
    const user = await this.getUserById(id);
    const isPasswordValid = await bcrypt.compare(oldPass, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid old password');
    }
    user.password = await bcrypt.hash(newPass, 10);
    return await this.userRepo.save(user);
  }
}
