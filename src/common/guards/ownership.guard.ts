import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OWNER_KEY, OwnerConfig } from '../decorators/owner.decorator';
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private postsService: any, // inject thật vào
    private usersService: any,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<OwnerConfig>(OWNER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!config) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('Unauthorized');
    if (user.roles === 'admin') return true;
    const id = request.params[config.paramKey];
    if (!id) throw new ForbiddenException('Missing resource id');
    const serviceMap = {
      post: this.postsService,
      user: this.usersService,
    };
    const service = serviceMap[config.entity];

    if (!service) {
      throw new ForbiddenException('Service not found');
    }
    const record = await service.findOneBy({ id });
    if (!record) {
      throw new ForbiddenException('Resource not found');
    }
    const isOwner = record[config.ownerField] === user.userId;
    if (!isOwner) {
      throw new ForbiddenException('You are not the owner');
    }
    return true;
  }
}
