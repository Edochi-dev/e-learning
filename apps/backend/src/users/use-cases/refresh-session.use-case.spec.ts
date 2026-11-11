import { Logger, UnauthorizedException } from '@nestjs/common';
import { RefreshSessionUseCase } from './refresh-session.use-case';
import { AuthSessionGateway } from '../gateways/auth-session.gateway';
import { UserGateway } from '../gateways/user.gateway';
import {
  AuthSessionService,
  hashRefreshToken,
} from '../services/auth-session.service';
import { AuthSession } from '../entities/auth-session.entity';
import { User } from '../entities/user.entity';

const NOW = new Date('2026-10-20T12:00:00Z');
const TOKEN = 'refresh-actual';
const user = { id: 'u1' } as User;

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    id: 's1',
    userId: 'u1',
    refreshTokenHash: hashRefreshToken(TOKEN),
    previousRefreshTokenHash: null,
    rotatedAt: null,
    expiresAt: new Date(NOW.getTime() + 86400_000),
    revokedAt: null,
    ...overrides,
  } as AuthSession;
}

describe('RefreshSessionUseCase', () => {
  let sessions: jest.Mocked<AuthSessionGateway>;
  let users: jest.Mocked<UserGateway>;
  let sessionService: jest.Mocked<AuthSessionService>;
  let useCase: RefreshSessionUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    sessions = {
      findByRefreshTokenHash: jest.fn().mockResolvedValue(session()),
      rotate: jest.fn().mockResolvedValue(true),
      revoke: jest.fn(),
    } as unknown as jest.Mocked<AuthSessionGateway>;
    users = {
      findOne: jest.fn().mockResolvedValue(user),
    } as unknown as jest.Mocked<UserGateway>;
    sessionService = {
      signAccessToken: jest.fn().mockReturnValue('nuevo-jwt'),
      newRefreshToken: jest.fn().mockReturnValue('refresh-nuevo'),
    } as unknown as jest.Mocked<AuthSessionService>;
    useCase = new RefreshSessionUseCase(sessions, users, sessionService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('rota el refresh token y emite un access token nuevo', async () => {
    await expect(useCase.execute(TOKEN)).resolves.toEqual({
      accessToken: 'nuevo-jwt',
      refreshToken: 'refresh-nuevo',
    });
    expect(sessions.rotate).toHaveBeenCalledWith(
      's1',
      hashRefreshToken(TOKEN),
      hashRefreshToken('refresh-nuevo'),
      new Date(NOW.getTime() + 30 * 86400_000),
    );
    expect(sessionService.signAccessToken).toHaveBeenCalledWith(user, 's1');
  });

  it.each([
    ['sin cookie', undefined, null],
    ['token desconocido', TOKEN, null],
    ['sesión revocada', TOKEN, session({ revokedAt: NOW })],
    ['sesión vencida', TOKEN, session({ expiresAt: NOW })],
  ])('rechaza: %s', async (_, token, found) => {
    sessions.findByRefreshTokenHash.mockResolvedValue(found);
    await expect(useCase.execute(token)).rejects.toThrow(UnauthorizedException);
    expect(sessions.rotate).not.toHaveBeenCalled();
  });

  it('rechaza si la usuaria ya no existe', async () => {
    users.findOne.mockResolvedValue(null);
    await expect(useCase.execute(TOKEN)).rejects.toThrow(UnauthorizedException);
  });

  describe('token ya rotado (copia del anterior)', () => {
    const rotated = (secondsAgo: number) =>
      session({
        refreshTokenHash: hashRefreshToken('otro-mas-nuevo'),
        previousRefreshTokenHash: hashRefreshToken(TOKEN),
        rotatedAt: new Date(NOW.getTime() - secondsAgo * 1000),
      });

    it('fuera de la ventana de gracia: revoca toda la sesión (robo)', async () => {
      sessions.findByRefreshTokenHash.mockResolvedValue(rotated(31));

      await expect(useCase.execute(TOKEN)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(sessions.revoke).toHaveBeenCalledWith('s1');
      expect(sessions.rotate).not.toHaveBeenCalled();
    });

    it('dentro de la ventana: es otra pestaña, solo emite access token', async () => {
      sessions.findByRefreshTokenHash.mockResolvedValue(rotated(5));

      await expect(useCase.execute(TOKEN)).resolves.toEqual({
        accessToken: 'nuevo-jwt',
        refreshToken: null,
      });
      expect(sessions.revoke).not.toHaveBeenCalled();
      expect(sessions.rotate).not.toHaveBeenCalled();
    });
  });

  it('si otra petición rotó primero, no rota de nuevo ni revoca', async () => {
    sessions.rotate.mockResolvedValue(false);

    await expect(useCase.execute(TOKEN)).resolves.toEqual({
      accessToken: 'nuevo-jwt',
      refreshToken: null,
    });
    expect(sessions.revoke).not.toHaveBeenCalled();
  });
});
