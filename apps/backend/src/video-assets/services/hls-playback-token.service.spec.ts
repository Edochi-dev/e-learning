import { ConfigService } from '@nestjs/config';
import { HlsPlaybackTokenService } from './hls-playback-token.service';

const ASSET = 'asset-1';
const USER = '11111111-2222-3333-4444-555555555555';

describe('HlsPlaybackTokenService', () => {
  const service = new HlsPlaybackTokenService({
    get: () => 'x'.repeat(48),
  } as unknown as ConfigService);
  const inAnHour = () => new Date(Date.now() + 3600_000);

  it('accepts its own token for the same asset and recovers the user', () => {
    const expiresAt = inAnHour();
    const grant = service.verify(service.issue(ASSET, USER, expiresAt), ASSET);

    expect(grant?.userId).toBe(USER);
    expect(grant?.expiresAt.getTime()).toBe(
      Math.floor(expiresAt.getTime() / 1000) * 1000,
    );
  });

  it('rejects the token for a different asset', () => {
    expect(
      service.verify(service.issue(ASSET, USER, inAnHour()), 'asset-2'),
    ).toBeNull();
  });

  it('rejects an expired token', () => {
    const past = new Date(Date.now() - 1000);
    expect(service.verify(service.issue(ASSET, USER, past), ASSET)).toBeNull();
  });

  it('rejects a token whose user or expiry was tampered with', () => {
    const [, expires, signature] = service
      .issue(ASSET, USER, inAnHour())
      .split('.');
    const later = Number(expires) + 86400;

    expect(
      service.verify(`other-user.${expires}.${signature}`, ASSET),
    ).toBeNull();
    expect(service.verify(`${USER}.${later}.${signature}`, ASSET)).toBeNull();
  });

  it('rejects missing and malformed tokens', () => {
    expect(service.verify(undefined, ASSET)).toBeNull();
    expect(service.verify('garbage', ASSET)).toBeNull();
    expect(service.verify(`${USER}.abc.sig`, ASSET)).toBeNull();
  });

  it('is not valid under a different root secret', () => {
    const other = new HlsPlaybackTokenService({
      get: () => 'y'.repeat(48),
    } as unknown as ConfigService);
    expect(
      other.verify(service.issue(ASSET, USER, inAnHour()), ASSET),
    ).toBeNull();
  });
});
