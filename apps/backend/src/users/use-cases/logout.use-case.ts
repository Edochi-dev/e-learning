import { Injectable } from '@nestjs/common';
import { AuthSessionGateway } from '../gateways/auth-session.gateway';
import { hashRefreshToken } from '../services/auth-session.service';

/**
 * Identifies the session by its refresh token rather than the access token,
 * which may already have expired when the user clicks "log out".
 */
@Injectable()
export class LogoutUseCase {
  constructor(private readonly sessions: AuthSessionGateway) {}

  async execute(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const session = await this.sessions.findByRefreshTokenHash(
      hashRefreshToken(refreshToken),
    );
    if (session) await this.sessions.revoke(session.id);
  }
}
