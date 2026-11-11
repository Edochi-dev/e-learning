import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoTokenService } from './video-token.service';

describe('VideoTokenService', () => {
  const service = new VideoTokenService({
    get: (key: string, fallback?: unknown) =>
      key === 'JWT_SECRET' ? 'x'.repeat(48) : fallback,
  } as unknown as ConfigService);
  const path = 'videos/clase1.mp4';

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('acepta su propio token para la misma ruta', () => {
    const { token } = service.generateToken(path);
    expect(service.validateToken(token, path)).toBe(true);
  });

  it('rechaza el token para otra ruta', () => {
    const { token } = service.generateToken(path);
    expect(service.validateToken(token, 'videos/otra.mp4')).toBe(false);
  });

  it('rechaza una firma alterada del mismo largo', () => {
    const { token } = service.generateToken(path);
    const [signature, expires] = token.split('.');
    const flipped = (signature[0] === 'a' ? 'b' : 'a') + signature.slice(1);
    expect(service.validateToken(`${flipped}.${expires}`, path)).toBe(false);
  });

  it('rechaza una firma de otro largo sin lanzar', () => {
    const { token } = service.generateToken(path);
    const [, expires] = token.split('.');
    expect(service.validateToken(`abc.${expires}`, path)).toBe(false);
  });

  it('rechaza un token vencido', () => {
    const { token } = service.generateToken(path);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 3 * 3600_000);
    expect(service.validateToken(token, path)).toBe(false);
  });

  it('rechaza tokens mal formados', () => {
    expect(service.validateToken('sin-punto', path)).toBe(false);
    expect(service.validateToken('a.b.c', path)).toBe(false);
    expect(service.validateToken('firma.no-es-numero', path)).toBe(false);
  });
});
