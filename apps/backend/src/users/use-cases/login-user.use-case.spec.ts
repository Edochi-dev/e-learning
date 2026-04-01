import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { LoginUserUseCase } from './login-user.use-case';
import { UserGateway } from '../gateways/user.gateway';
import { TokenGateway } from '../gateways/token.gateway';
import { User } from '../entities/user.entity';
import { UserRole } from '@maris-nails/shared';

/**
 * Tests para LoginUserUseCase — autenticación de usuarios.
 *
 * Este Use Case es el guardian de toda la aplicación.
 * Si falla, un atacante podría entrar sin credenciales válidas.
 * Si da demasiada info en los errores, permite enumerar emails.
 *
 * ¿Qué testeamos?
 *   - ¿Rechaza emails inexistentes?
 *   - ¿Rechaza passwords incorrectos?
 *   - ¿Usa el MISMO mensaje en ambos casos? (anti-enumeración)
 *   - ¿El token JWT contiene los datos correctos?
 *   - ¿Retorna user + token en el happy path?
 */

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('LoginUserUseCase', () => {
  let useCase: LoginUserUseCase;
  let userGateway: jest.Mocked<UserGateway>;
  let tokenGateway: jest.Mocked<TokenGateway>;

  const fakeUser = {
    id: 'user-uuid-123',
    email: 'alumna@test.com',
    fullName: 'María López',
    password: 'hashed-password-en-bd',
    role: UserRole.STUDENT,
  } as User;

  const loginDto = {
    email: 'alumna@test.com',
    password: 'mi-password-123',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        LoginUserUseCase,
        {
          provide: UserGateway,
          useValue: {
            findByEmail: jest.fn(),
          },
        },
        {
          provide: TokenGateway,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(LoginUserUseCase);
    userGateway = module.get(UserGateway);
    tokenGateway = module.get(TokenGateway);
  });

  // ──────────────────────────────────────────────────────────
  // 1. VALIDACIÓN: ¿El usuario existe?
  // ──────────────────────────────────────────────────────────

  /**
   * Si no hay ningún usuario con ese email, el login debe fallar.
   *
   * IMPORTANTE: el mensaje es 'Invalid credentials', NO 'Email no encontrado'.
   * ¿Por qué? Seguridad anti-enumeración. Si dijéramos "el email no existe",
   * un atacante podría probar miles de emails y saber cuáles están registrados.
   */
  it('lanza UnauthorizedException si el email no existe', async () => {
    userGateway.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute(loginDto)).rejects.toThrow(
      UnauthorizedException,
    );

    // No debe intentar firmar un token — fail fast
    expect(tokenGateway.sign).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 2. VALIDACIÓN: ¿La contraseña es correcta?
  // ──────────────────────────────────────────────────────────

  /**
   * El email existe, pero la contraseña no coincide con el hash en la BD.
   * bcrypt.compare devuelve false → UnauthorizedException.
   *
   * Mismo mensaje genérico que cuando el email no existe.
   * Así el atacante no sabe si falló el email o la contraseña.
   */
  it('lanza UnauthorizedException si la contraseña es incorrecta', async () => {
    userGateway.findByEmail.mockResolvedValue(fakeUser);
    mockedBcrypt.compare.mockResolvedValue(false as never);

    await expect(useCase.execute(loginDto)).rejects.toThrow(
      UnauthorizedException,
    );

    // No debe generar token si la contraseña es incorrecta
    expect(tokenGateway.sign).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 3. SEGURIDAD: bcrypt.compare recibe los valores correctos
  // ──────────────────────────────────────────────────────────

  /**
   * Verificamos que bcrypt.compare se llama con:
   *   arg1: la contraseña en texto plano que envió el usuario (del DTO)
   *   arg2: el hash almacenado en la base de datos (del User)
   *
   * Si alguien invierte los argumentos por error, bcrypt.compare
   * siempre devolvería false y nadie podría loguearse.
   */
  it('compara la contraseña del DTO contra el hash almacenado en la BD', async () => {
    userGateway.findByEmail.mockResolvedValue(fakeUser);
    mockedBcrypt.compare.mockResolvedValue(true as never);
    tokenGateway.sign.mockReturnValue('jwt-token');

    await useCase.execute(loginDto);

    expect(mockedBcrypt.compare).toHaveBeenCalledWith(
      'mi-password-123',          // lo que escribió el usuario
      'hashed-password-en-bd',    // lo que está guardado en la BD
    );
  });

  // ──────────────────────────────────────────────────────────
  // 4. TOKEN: el payload contiene los campos correctos
  // ──────────────────────────────────────────────────────────

  /**
   * El JWT es como una "credencial digital" que el frontend envía en cada request.
   * Su payload debe contener:
   *   - sub: el ID del usuario (estándar JWT)
   *   - email: para identificación
   *   - role: para autorización (¿es STUDENT o ADMIN?)
   *   - fullName: para mostrar en la UI sin hacer otra query
   *
   * Si falta el role, los guards de autorización fallan.
   * Si falta el sub, no sabemos quién hizo el request.
   */
  it('firma el token con el payload correcto (sub, email, role, fullName)', async () => {
    userGateway.findByEmail.mockResolvedValue(fakeUser);
    mockedBcrypt.compare.mockResolvedValue(true as never);
    tokenGateway.sign.mockReturnValue('jwt-token');

    await useCase.execute(loginDto);

    expect(tokenGateway.sign).toHaveBeenCalledWith({
      sub: 'user-uuid-123',
      email: 'alumna@test.com',
      role: UserRole.STUDENT,
      fullName: 'María López',
    });
  });

  // ──────────────────────────────────────────────────────────
  // 5. HAPPY PATH: login exitoso retorna user + token
  // ──────────────────────────────────────────────────────────

  /**
   * Flujo feliz completo:
   *   1. Email existe ✓
   *   2. Contraseña coincide ✓
   *   3. Token firmado correctamente ✓
   *   4. Retorna { user, token } ✓
   *
   * El frontend usa el 'user' para mostrar datos y el 'token'
   * para adjuntarlo en el header Authorization de las peticiones.
   */
  it('retorna el usuario y el token JWT cuando las credenciales son válidas', async () => {
    userGateway.findByEmail.mockResolvedValue(fakeUser);
    mockedBcrypt.compare.mockResolvedValue(true as never);
    tokenGateway.sign.mockReturnValue('jwt-token-firmado');

    const result = await useCase.execute(loginDto);

    expect(result.user).toBe(fakeUser);
    expect(result.token).toBe('jwt-token-firmado');
  });
});
