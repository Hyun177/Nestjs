import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Allows requests with or without JWT. If JWT is present and valid, req.user is set.
@Injectable()
export class JwtOptionalGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err) return null;
    return user || null;
  }
}

