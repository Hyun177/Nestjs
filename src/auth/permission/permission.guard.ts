import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithUser } from '../../users/types/user-payload.type';
import { DataSource, In } from 'typeorm';
import { Role } from '../../users/entities/role.entity';
import { Permission } from '../../users/entities/permission.entity';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) return false;

    // Fetch all roles with their permissions from database
    const roleRepo = this.dataSource.getRepository(Role);
    const roles = await roleRepo.find({
      where: { name: In(user.roles) },
      relations: ['permissions'],
    });

    if (!roles || roles.length === 0) {
      console.log(`Roles ${user.roles.join(', ')} not found in database`);
      return false;
    }

    // Combine permissions from all roles
    const userPermissions: string[] = [];
    roles.forEach((r) => {
      (r.permissions || []).forEach((p) => {
        if (!userPermissions.includes(p.name)) {
          userPermissions.push(p.name);
        }
      });
    });

    console.log('User roles from request:', user.roles);
    console.log('Combined user permissions from DB:', userPermissions);
    console.log('Required permissions:', requiredPermissions);

    // Check if every required permission is covered by user permissions
    // We normalize both by replacing ':' with '_' to handle naming inconsistencies
    const normalize = (p: string) => p.replace(':', '_').toLowerCase().trim();

    const normalizedUserPerms = userPermissions.map(normalize);
    return requiredPermissions.every((perm) =>
      normalizedUserPerms.includes(normalize(perm)),
    );
  }
}
