import { AuthSessionService, hashRefreshToken } from './auth-session.service';
import { AuthSessionGateway } from '../gateways/auth-session.gateway';
import { TokenGateway } from '../gateways/token.gateway';
import { AuthSession } from '../entities/auth-session.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '@maris-nails/shared';

describe('AuthSessionService', () => {
  const user = {
    id: 'u1',
    email: 'ana@test.com',
    role: UserRole.STUDENT,
    fullName: 'Ana',
  } as User;
  let sessions: jest.Mocked<AuthSessionGateway>;
  let tokens: jest.Mocked<TokenGateway>;
  let service: AuthSessionService;

  beforeEach(() => {
    sessions = {
      create: jest.fn().mockResolvedValue({ id: 's1' } as AuthSession),
    } as unknown as jest.Mocked<AuthSessionGateway>;
    tokens = { sign: jest.fn().mockReturnValue('jwt') };
    service = new AuthSessionService(sessions, tokens);
  });

  it('guarda solo el hash del refresh token, nunca el token', async () => {
    const result = await service.start(user, 'Mozilla');

    const stored = sessions.create.mock.calls[0][0];
    expect(stored.refreshTokenHash).toBe(
      hashRefreshToken(result.refreshToken!),
    );
    expect(JSON.stringify(stored)).not.toContain(result.refreshToken);
  });

  it('firma el access token con la sesión (sid) y los datos de la usuaria', async () => {
    await service.start(user, null);

    expect(tokens.sign).toHaveBeenCalledWith({
      sub: 'u1',
      sid: 's1',
      email: 'ana@test.com',
      role: UserRole.STUDENT,
      fullName: 'Ana',
    });
  });

  it('genera refresh tokens distintos y largos', () => {
    const a = service.newRefreshToken();
    expect(a).not.toBe(service.newRefreshToken());
    expect(a.length).toBeGreaterThanOrEqual(43); // 32 bytes en base64url
  });

  it('recorta un user-agent desmesurado a lo que cabe en la columna', async () => {
    await service.start(user, 'x'.repeat(1000));
    expect(sessions.create.mock.calls[0][0].userAgent).toHaveLength(255);
  });
});
