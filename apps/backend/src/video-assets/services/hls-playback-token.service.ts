import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export interface PlaybackGrant {
  userId: string;
  expiresAt: Date;
}

/**
 * Token that lets one user fetch the playlists and the key of one asset until
 * it expires. Format: `<userId>.<expiresUnixSeconds>.<signature>`.
 *
 * The userId is signed in so that a leaked URL can be traced back to the
 * account it was issued to.
 */
@Injectable()
export class HlsPlaybackTokenService {
  private readonly secret: Buffer;

  constructor(config: ConfigService) {
    // Derived rather than reused: a signature valid here must never be valid
    // for the JWT or for the legacy /videos/stream token, which share the root.
    this.secret = createHmac('sha256', config.get<string>('JWT_SECRET')!)
      .update('hls-playback-token')
      .digest();
  }

  issue(assetId: string, userId: string, expiresAt: Date): string {
    const expires = Math.floor(expiresAt.getTime() / 1000);
    return `${userId}.${expires}.${this.sign(assetId, userId, expires)}`;
  }

  verify(token: string | undefined, assetId: string): PlaybackGrant | null {
    const parts = token?.split('.') ?? [];
    if (parts.length !== 3) return null;

    const [userId, expiresStr, signature] = parts;
    const expires = Number(expiresStr);
    if (!Number.isInteger(expires) || expires * 1000 <= Date.now()) {
      return null;
    }

    const expected = Buffer.from(this.sign(assetId, userId, expires));
    const given = Buffer.from(signature);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return null;
    }

    return { userId, expiresAt: new Date(expires * 1000) };
  }

  private sign(assetId: string, userId: string, expires: number): string {
    return createHmac('sha256', this.secret)
      .update(`${assetId}:${userId}:${expires}`)
      .digest('base64url');
  }
}
