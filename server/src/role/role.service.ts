// src/role/role.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Role } from '../users/entities/role.entity';
import { Permission as PermissionEntity } from '../users/entities/permission.entity';
import { User } from '../users/entities/user.entity';
import { Permission } from '../auth/permission/permissions.enum';
import { RoleEnum } from './role.enum';

@Injectable()
export class RoleService {
  constructor(private dataSource: DataSource) {}

  async runSeeding() {
    const roles = Object.values(RoleEnum);
    
    // Define Permission Groupings (Same as in seed-roles.ts)
    const commonUserPerms = [
      Permission.PRODUCT_READ, Permission.CATEGORY_READ, Permission.BRAND_READ,
      Permission.POST_READ, Permission.CART_CREATE, Permission.CART_READ,
      Permission.CART_UPDATE, Permission.CART_DELETE, Permission.ORDER_CREATE,
      Permission.ORDER_READ, Permission.ORDER_CANCEL, Permission.REVIEW_CREATE,
      Permission.REVIEW_READ, Permission.VOUCHER_READ, Permission.VOUCHER_APPLY,
      Permission.SELLER_REQUEST_CREATE,
    ];

    const sellerPerms = [
      ...commonUserPerms,
      Permission.PRODUCT_CREATE, Permission.PRODUCT_UPDATE, Permission.PRODUCT_DELETE,
      Permission.ORDER_UPDATE, Permission.ORDER_SHIP, Permission.ORDER_DELIVER, Permission.SHOP_READ,
      Permission.SHOP_UPDATE, Permission.SHOP_MANAGE,
    ];

    const managerPerms = [
      ...commonUserPerms,
      // Quản lý sản phẩm và nội dung
      Permission.PRODUCT_UPDATE,
      Permission.CATEGORY_CREATE, Permission.CATEGORY_UPDATE, Permission.CATEGORY_DELETE,
      Permission.BRAND_CREATE, Permission.BRAND_UPDATE, Permission.BRAND_DELETE,
      Permission.POST_CREATE, Permission.POST_UPDATE, Permission.POST_DELETE,
      // Quản lý đơn hàng và voucher
      Permission.ORDER_READ, Permission.ORDER_UPDATE, Permission.ORDER_CANCEL,
      Permission.ORDER_MANAGE, Permission.VOUCHER_CREATE, Permission.VOUCHER_UPDATE,
      Permission.VOUCHER_DELETE,
      // Quản lý người dùng và đối tác
      Permission.USER_READ, Permission.USER_UPDATE,
      Permission.SELLER_REQUEST_READ, Permission.SELLER_REQUEST_APPROVE,
      Permission.SELLER_REQUEST_REJECT,
      // Duyệt đánh giá
      Permission.REVIEW_APPROVE, Permission.REVIEW_DELETE,
    ];

    const allPerms = Object.values(Permission);

    const roleAssignments: Record<RoleEnum, Permission[]> = {
      [RoleEnum.USER]: commonUserPerms,
      [RoleEnum.SELLER]: sellerPerms,
      [RoleEnum.MANAGER]: managerPerms,
      [RoleEnum.ADMIN]: allPerms,
    };

    for (const roleName of roles) {
      try {
        await this.createRole(roleName);
        const perms = roleAssignments[roleName as RoleEnum];
        if (perms) {
          await this.assignPermissions(roleName, perms);
        }
      } catch (e) {
        console.error(`- Auto-seeding failed for "${roleName}":`, e.message);
      }
    }
    console.log('✅ Auto-seeding of roles and permissions completed.');
  }

  async createRole(name: string): Promise<Role> {
    const roleRepo = this.dataSource.getRepository(Role);
    const existing = await roleRepo.findOne({ where: { name } });
    if (existing) return existing;
    const role = roleRepo.create({ name });
    return roleRepo.save(role);
  }

  async ensurePermissions(
    permissionNames: Permission[],
  ): Promise<PermissionEntity[]> {
    const permRepo = this.dataSource.getRepository(PermissionEntity);
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
    permissionNames: Permission[],
  ): Promise<Role> {
    const roleRepo = this.dataSource.getRepository(Role);
    const role = await roleRepo.findOne({
      where: { name: roleName },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException(`Role '${roleName}' not found`);

    const permissions = await this.ensurePermissions(permissionNames);
    // Replace (not append) so the assignment is idempotent
    role.permissions = permissions;
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
    if (!role) throw new NotFoundException(`Role '${roleName}' not found`);

    const alreadyHas = (user.roles ?? []).some((r) => r.id === role.id);
    if (!alreadyHas) {
      user.roles = [...(user.roles ?? []), role];
      await userRepo.save(user);
    }
    return user;
  }

  async getRoleWithPermissions(roleName: string): Promise<Role | null> {
    const roleRepo = this.dataSource.getRepository(Role);
    return roleRepo.findOne({
      where: { name: roleName },
      relations: ['permissions', 'users'],
    });
  }

  async listRoles(): Promise<Role[]> {
    const roleRepo = this.dataSource.getRepository(Role);
    return roleRepo.find({ relations: ['permissions'] });
  }

  getAllPermissions(): string[] {
    return Object.values(Permission);
  }
}
