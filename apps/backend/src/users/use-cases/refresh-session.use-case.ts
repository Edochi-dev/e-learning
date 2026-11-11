import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthSessionGateway } from '../gateways/auth-session.gateway';
import { UserGateway } from '../gateways/user.gateway';
import { User } from '../entities/user.entity';
import {
  AuthSessionService,
  SessionTokens,
  hashRefreshToken,
  refreshTokenExpiry,
} from '../services/auth-session.service';
import { ROTATION_GRACE_SECONDS } from '../services/session-policy';

/**
 * Trades a refresh token for a new access token, rotating the refresh token.
 * Presenting an already-rotated token outside the grace window means two
 * parties hold the same token, so the whole session is revoked.
 */
@Injectable()
export class RefreshSessionUseCase {
  private readonly logger = new Logger(RefreshSessionUseCase.name);

  constructor(
    private readonly sessions: AuthSessionGateway,
    private readonly users: UserGateway,
    private readonly sessionService: AuthSessionService,
  ) {}

  async execute(refreshToken: string | undefined): Promise<SessionTokens> {
    if (!refreshToken) throw new UnauthorizedException();

    const hash = hashRefreshToken(refreshToken);
    const session = await this.sessions.findByRefreshTokenHash(hash);
    const now = new Date();
    if (!session || session.revokedAt || session.expiresAt <= now) {
      throw new UnauthorizedException();
    }

    const user = await this.users.findOne(session.userId);
    if (!user) throw new UnauthorizedException();

    if (session.refreshTokenHash !== hash) {
      if (this.withinGrace(session.rotatedAt, now)) {
        return this.accessOnly(user, session.id);
      }
      this.logger.warn(
        `Refresh token reutilizado en la sesión ${session.id}: se revoca`,
      );
      await this.sessions.revoke(session.id);
      throw new UnauthorizedException();
    }

    const newRefreshToken = this.sessionService.newRefreshToken();
    const won = await this.sessions.rotate(
      session.id,
      hash,
      hashRefreshToken(newRefreshToken),
      refreshTokenExpiry(now),
    );
    // Lost the race to a concurrent refresh that already set the new cookie.
    if (!won) return this.accessOnly(user, session.id);

    return {
      accessToken: this.sessionService.signAccessToken(user, session.id),
      refreshToken: newRefreshToken,
    };
  }

  private withinGrace(rotatedAt: Date | null, now: Date): boolean {
    return (
      rotatedAt !== null &&
      now.getTime() - rotatedAt.getTime() <= ROTATION_GRACE_SECONDS * 1000
    );
  }

  private accessOnly(user: User, sessionId: string): SessionTokens {
    return {
      accessToken: this.sessionService.signAccessToken(user, sessionId),
      refreshToken: null,
    };
  }
}
