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
    if (!roles || roles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{
      user: UserPayload;
    }>();
    const user = request.user;

    if (!user) return false;

    const hasRole = roles.some((requiredRole) =>
      user.roles
        ?.map((r) => r.toLowerCase())
        .includes(requiredRole.toLowerCase()),
    );
    return hasRole;
  }
}
