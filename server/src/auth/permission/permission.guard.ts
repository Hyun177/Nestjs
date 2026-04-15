import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithUser } from '../../users/types/user-payload.type';
import { DataSource, In } from 'typeorm';
import { Role } from '../../users/entities/role.entity';
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
    const roleRepo = this.dataSource.getRepository(Role);
    const roles = await roleRepo.find({
      where: { name: In(user.roles) },
      relations: ['permissions'],
    });

    if (!roles || roles.length === 0) {
      return false;
    }
    const userPermissions: string[] = [];
    roles.forEach((r) => {
      (r.permissions || []).forEach((p) => {
        if (!userPermissions.includes(p.name)) {
          userPermissions.push(p.name);
        }
      });
    });

    const normalize = (p: string) => p.replace(':', '_').toLowerCase().trim();

    const normalizedUserPerms = userPermissions.map(normalize);
    const result = requiredPermissions.every((perm) => {
      const normalizedPerm = normalize(perm);
      return normalizedUserPerms.includes(normalizedPerm);
    });

    return result;
  }
}
