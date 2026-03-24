import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OWNER_KEY, OwnerConfig } from '../decorators/owner.decorator';
import { RequestWithUser } from '../types/request-with-user';

interface EntityRecord {
  [key: string]: unknown;
}

interface ServiceInterface {
  findOneBy(query: Record<string, unknown>): Promise<EntityRecord | null>;
}

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private postsService: ServiceInterface,
    private usersService: ServiceInterface,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<OwnerConfig>(OWNER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!config) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) throw new ForbiddenException('Unauthorized');
    if (user.role === 'admin') return true;

    const paramKey = config.paramKey;
    const id = request.params[paramKey];

    if (!id) throw new ForbiddenException('Missing resource id');

    const serviceMap: Record<string, ServiceInterface> = {
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

    const ownerField = config.ownerField;
    const isOwner = record[ownerField] === user.userId;

    if (!isOwner) {
      throw new ForbiddenException('You are not the owner');
    }
    return true;
  }
}
