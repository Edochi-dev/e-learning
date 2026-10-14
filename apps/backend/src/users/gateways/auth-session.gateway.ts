import { AuthSession } from '../entities/auth-session.entity';

export interface NewAuthSession {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
}

export abstract class AuthSessionGateway {
  abstract create(data: NewAuthSession): Promise<AuthSession>;

  /** Matches the current or the previous token hash, revoked or not. */
  abstract findByRefreshTokenHash(hash: string): Promise<AuthSession | null>;

  /**
   * Swaps the current token for a new one, but only if `expectedHash` is
   * still current: of two concurrent refreshes with the same token, exactly
   * one wins. Returns whether this call won.
   */
  abstract rotate(
    id: string,
    expectedHash: string,
    newHash: string,
    expiresAt: Date,
  ): Promise<boolean>;

  abstract isActive(id: string, userId: string): Promise<boolean>;

  abstract revoke(id: string): Promise<void>;

  abstract revokeAllForUser(userId: string, exceptId?: string): Promise<void>;

  /** Deletes sessions that expired or were revoked before `cutoff`. */
  abstract deleteStale(cutoff: Date): Promise<number>;
}
