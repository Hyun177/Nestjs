// src/role/role.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Role } from '../users/entities/role.entity';
import { Permission } from '../users/entities/permission.entity';
import { User } from '../users/entities/user.entity';
import { PermissionEnum } from './permissions.enum';

@Injectable()
export class RoleService {
  constructor(private dataSource: DataSource) {}

  async createRole(name: string): Promise<Role> {
    const roleRepo = this.dataSource.getRepository(Role);
    const role = roleRepo.create({ name });
    return roleRepo.save(role);
  }

  async ensurePermissions(
    permissionNames: PermissionEnum[],
  ): Promise<Permission[]> {
    const permRepo = this.dataSource.getRepository(Permission);

    const existing = await permRepo.find({
      where: { name: In(permissionNames) },
    });

    const existingNames = existing.map((p) => p.name);

    const newPermissions = permissionNames
      .filter((name) => !existingNames.includes(name))
      .map((name) => permRepo.create({ name }));

    await permRepo.save(newPermissions);
    return [...existing, ...newPermissions];
  }

  async assignPermissions(
    roleName: string,
    permissionNames: PermissionEnum[],
  ): Promise<Role> {
    const roleRepo = this.dataSource.getRepository(Role);
    const role = await roleRepo.findOne({
      where: { name: roleName },
      relations: ['permissions'],
    });

    if (!role) throw new NotFoundException('Role not found');

    const permissions = await this.ensurePermissions(permissionNames);
    role.permissions = [
      ...new Set([...(role.permissions || []), ...permissions]),
    ];
    return roleRepo.save(role);
  }

  async assignRoleToUser(userEmail: string, roleName: string): Promise<User> {
    const userRepo = this.dataSource.getRepository(User);
    const roleRepo = this.dataSource.getRepository(Role);

    const user = await userRepo.findOne({
      where: { email: userEmail },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');

    const role = await roleRepo.findOne({ where: { name: roleName } });
    if (!role) throw new NotFoundException('Role not found');

    user.roles = [...new Set([...(user.roles || []), role])];
    await userRepo.save(user);
    return user;
  }

  async getRoleWithPermissions(roleName: string): Promise<Role | null> {
    const roleRepo = this.dataSource.getRepository(Role);
    return roleRepo.findOne({
      where: { name: roleName },
      relations: ['permissions', 'users'],
    });
  }

  getAllPermissions(): string[] {
    return Object.values(PermissionEnum);
  }
}
