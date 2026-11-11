import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { LoginUserUseCase } from './login-user.use-case';
import { UserGateway } from '../gateways/user.gateway';
import { AuthSessionService } from '../services/auth-session.service';
import { User } from '../entities/user.entity';
import { UserRole } from '@maris-nails/shared';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('LoginUserUseCase', () => {
  let useCase: LoginUserUseCase;
  let userGateway: jest.Mocked<UserGateway>;
  let sessionService: jest.Mocked<AuthSessionService>;

  const fakeUser = {
    id: 'user-uuid-123',
    email: 'alumna@test.com',
    fullName: 'María López',
    password: 'hashed-password-en-bd',
    role: UserRole.STUDENT,
  } as User;
  const loginDto = { email: 'alumna@test.com', password: 'mi-password-123' };
  const tokens = { accessToken: 'jwt', refreshToken: 'refresh' };

  beforeEach(() => {
    jest.clearAllMocks();
    userGateway = {
      findByEmail: jest.fn(),
    } as unknown as jest.Mocked<UserGateway>;
    sessionService = {
      start: jest.fn().mockResolvedValue(tokens),
    } as unknown as jest.Mocked<AuthSessionService>;
    useCase = new LoginUserUseCase(userGateway, sessionService);
  });

  it('rechaza un email inexistente sin abrir sesión', async () => {
    userGateway.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute(loginDto, null)).rejects.toThrow(
      new UnauthorizedException('Invalid credentials'),
    );
    expect(sessionService.start).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña incorrecta sin abrir sesión', async () => {
    userGateway.findByEmail.mockResolvedValue(fakeUser);
    mockedBcrypt.compare.mockResolvedValue(false as never);

    await expect(useCase.execute(loginDto, null)).rejects.toThrow(
      new UnauthorizedException('Invalid credentials'),
    );
    expect(sessionService.start).not.toHaveBeenCalled();
  });

  it('usa el mismo mensaje para email y contraseña (anti-enumeración)', async () => {
    userGateway.findByEmail.mockResolvedValue(null);
    const noUser = (await useCase
      .execute(loginDto, null)
      .catch((e: Error) => e)) as Error;

    userGateway.findByEmail.mockResolvedValue(fakeUser);
    mockedBcrypt.compare.mockResolvedValue(false as never);
    const badPassword = (await useCase
      .execute(loginDto, null)
      .catch((e: Error) => e)) as Error;

    expect(noUser.message).toBe(badPassword.message);
  });

  it('compara contra el hash guardado', async () => {
    userGateway.findByEmail.mockResolvedValue(fakeUser);
    mockedBcrypt.compare.mockResolvedValue(true as never);

    await useCase.execute(loginDto, null);
    expect(mockedBcrypt.compare).toHaveBeenCalledWith(
      'mi-password-123',
      'hashed-password-en-bd',
    );
  });

  it('abre una sesión para el dispositivo y devuelve sus tokens', async () => {
    userGateway.findByEmail.mockResolvedValue(fakeUser);
    mockedBcrypt.compare.mockResolvedValue(true as never);

    const result = await useCase.execute(loginDto, 'Mozilla/5.0');

    expect(sessionService.start).toHaveBeenCalledWith(fakeUser, 'Mozilla/5.0');
    expect(result).toEqual({ user: fakeUser, tokens });
  });
});
