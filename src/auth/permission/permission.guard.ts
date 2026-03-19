import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithUser } from 'src/users/types/user-payload.type';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { ROLE_PERMISSIONS } from './role-permissions';

@Injectable()
export class PermissionGuard {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions) return true;
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) return false;
    const userPermissions =
      ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS];
    return requiredPermissions.every((perm) => userPermissions.includes(perm));
  }
}
