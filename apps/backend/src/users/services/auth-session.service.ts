import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { AuthSessionGateway } from '../gateways/auth-session.gateway';
import { TokenGateway } from '../gateways/token.gateway';
import { User } from '../entities/user.entity';
import { REFRESH_TOKEN_TTL_SECONDS } from './session-policy';

export interface SessionTokens {
  accessToken: string;
  /** Null when the refresh kept the current token (see ROTATION_GRACE_SECONDS). */
  refreshToken: string | null;
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiry(from = new Date()): Date {
  return new Date(from.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000);
}

/** Opens sessions and signs their access tokens; shared by every sign-in path. */
@Injectable()
export class AuthSessionService {
  constructor(
    private readonly sessions: AuthSessionGateway,
    private readonly tokens: TokenGateway,
  ) {}

  async start(user: User, userAgent: string | null): Promise<SessionTokens> {
    const refreshToken = this.newRefreshToken();
    const session = await this.sessions.create({
      userId: user.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiry(),
      userAgent: userAgent?.slice(0, 255) ?? null,
    });
    return {
      accessToken: this.signAccessToken(user, session.id),
      refreshToken,
    };
  }

  signAccessToken(user: User, sessionId: string): string {
    return this.tokens.sign({
      sub: user.id,
      sid: sessionId,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });
  }

  newRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }
}
