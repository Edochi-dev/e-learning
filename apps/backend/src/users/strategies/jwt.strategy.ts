import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { UserGateway } from '../gateways/user.gateway';
import { AuthSessionGateway } from '../gateways/auth-session.gateway';
import { ACCESS_TOKEN_COOKIE } from '../auth-cookies';
import { AuthenticatedUser, withSessionId } from '../authenticated-user';

function extractJwtFromCookie(req: Request): string | null {
  return (req?.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined) ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userGateway: UserGateway,
    private readonly sessions: AuthSessionGateway,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: extractJwtFromCookie,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  // Checking the session on every request is what makes logout and password
  // changes take effect immediately instead of when the access token expires.
  async validate(payload: {
    sub: string;
    sid?: string;
  }): Promise<AuthenticatedUser> {
    if (
      !payload.sid ||
      !(await this.sessions.isActive(payload.sid, payload.sub))
    ) {
      throw new UnauthorizedException();
    }
    const user = await this.userGateway.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return withSessionId(user, payload.sid);
  }
}
