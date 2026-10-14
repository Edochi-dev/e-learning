import { LogoutUseCase } from './logout.use-case';
import { AuthSessionGateway } from '../gateways/auth-session.gateway';
import { hashRefreshToken } from '../services/auth-session.service';
import { AuthSession } from '../entities/auth-session.entity';

describe('LogoutUseCase', () => {
  let sessions: jest.Mocked<AuthSessionGateway>;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    sessions = {
      findByRefreshTokenHash: jest.fn(),
      revoke: jest.fn(),
    } as unknown as jest.Mocked<AuthSessionGateway>;
    useCase = new LogoutUseCase(sessions);
  });

  it('revoca la sesión del refresh token, aunque el access token ya venció', async () => {
    sessions.findByRefreshTokenHash.mockResolvedValue({
      id: 's1',
    } as AuthSession);

    await useCase.execute('refresh');

    expect(sessions.findByRefreshTokenHash).toHaveBeenCalledWith(
      hashRefreshToken('refresh'),
    );
    expect(sessions.revoke).toHaveBeenCalledWith('s1');
  });

  it('sin cookie o con un token desconocido no hace nada (y no falla)', async () => {
    await useCase.execute(undefined);
    sessions.findByRefreshTokenHash.mockResolvedValue(null);
    await useCase.execute('desconocido');

    expect(sessions.revoke).not.toHaveBeenCalled();
  });
});
