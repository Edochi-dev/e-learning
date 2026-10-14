import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { JwtStrategy } from './jwt.strategy';
import { UserGateway } from '../gateways/user.gateway';
import { AuthSessionGateway } from '../gateways/auth-session.gateway';
import { User } from '../entities/user.entity';

describe('JwtStrategy', () => {
  let users: jest.Mocked<UserGateway>;
  let sessions: jest.Mocked<AuthSessionGateway>;
  let strategy: JwtStrategy;
  const user = () =>
    plainToInstance(User, { id: 'u1', email: 'a@t.c', password: 'hash' });

  beforeEach(() => {
    users = {
      findOne: jest.fn().mockResolvedValue(user()),
    } as unknown as jest.Mocked<UserGateway>;
    sessions = {
      isActive: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<AuthSessionGateway>;
    strategy = new JwtStrategy(users, sessions, {
      get: () => 'x'.repeat(32),
    } as unknown as ConfigService);
  });

  it('acepta un token de una sesión activa y expone su sessionId', async () => {
    const result = await strategy.validate({ sub: 'u1', sid: 's1' });

    expect(sessions.isActive).toHaveBeenCalledWith('s1', 'u1');
    expect(result.id).toBe('u1');
    expect(result.sessionId).toBe('s1');
  });

  it('rechaza un token sin sid (emitido antes de existir las sesiones)', async () => {
    await expect(strategy.validate({ sub: 'u1' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza al instante si la sesión fue revocada, aunque el JWT no haya vencido', async () => {
    sessions.isActive.mockResolvedValue(false);
    await expect(strategy.validate({ sub: 'u1', sid: 's1' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza si la usuaria ya no existe', async () => {
    users.findOne.mockResolvedValue(null);
    await expect(strategy.validate({ sub: 'u1', sid: 's1' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('al serializar req.user no filtra ni el sessionId ni el hash de la contraseña', async () => {
    const plain = instanceToPlain(
      await strategy.validate({ sub: 'u1', sid: 's1' }),
    );

    expect(plain).not.toHaveProperty('sessionId');
    expect(plain).not.toHaveProperty('password');
    expect(plain.email).toBe('a@t.c');
  });
});
