import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from '../common/types/request-with-user';

export const CurrentUser = createParamDecorator(
  (data: keyof RequestWithUser['user'], context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);
