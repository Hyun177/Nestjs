import { Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { JwtPayload } from './jwt.payload';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'secretKey',
    });
  }
  validate(payload: JwtPayload) {
    console.log('JWT Payload received in Strategy:', payload);
    const user = {
      id: payload.sub,
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles || ['user'],
    };
    console.log('Mapped user object:', user);
    return user;
  }
}
