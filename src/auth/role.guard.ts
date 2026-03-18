import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserPayload } from '../users/types/user-payload.type';
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    console.log('roles:', roles);
    if (!roles || roles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{
      user: UserPayload;
    }>();
    const user = request.user;

    if (!user) return false;
    console.log('Required roles:', roles);
    console.log('User role:', user?.role);
    console.log('Compare:', roles.includes(user?.role));
    return roles.includes(user.role?.toLowerCase());
  }
}
