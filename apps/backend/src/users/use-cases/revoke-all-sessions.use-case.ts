import { Injectable } from '@nestjs/common';
import { AuthSessionGateway } from '../gateways/auth-session.gateway';

/** "Log out on every device", the current one included. */
@Injectable()
export class RevokeAllSessionsUseCase {
  constructor(private readonly sessions: AuthSessionGateway) {}

  execute(userId: string): Promise<void> {
    return this.sessions.revokeAllForUser(userId);
  }
}
