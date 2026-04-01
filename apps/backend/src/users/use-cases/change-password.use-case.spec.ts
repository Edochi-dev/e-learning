import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { ChangePasswordUseCase } from './change-password.use-case';
import { UserGateway } from '../gateways/user.gateway';
import { User } from '../entities/user.entity';

/**
 * Tests para ChangePasswordUseCase — cambio de contraseña autenticado.
 *
 * Este flujo requiere que el usuario demuestre que SABE la contraseña actual
 * antes de poder cambiarla. Es una capa extra de seguridad más allá del JWT.
 *
 * ¿Por qué no basta con estar logueado (tener JWT)?
 *   Imagina: dejaste tu sesión abierta en una computadora pública.
 *   Alguien podría cambiar tu contraseña y sacarte de tu propia cuenta.
 *   Al exigir la contraseña actual, incluso con la sesión abierta,
 *   el atacante no puede cambiarla si no la sabe.
 *
 * Escenarios a testear:
 *   1. Usuario no encontrado → NotFoundException
 *   2. Contraseña actual incorrecta → UnauthorizedException
 *   3. Happy path: nueva contraseña hasheada y guardada
 *   4. Verificar que updatePassword NO se llama si hay errores (fail-fast)
 */

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('ChangePasswordUseCase', () => {
  let useCase: ChangePasswordUseCase;
  let userGateway: jest.Mocked<UserGateway>;

  const userId = 'user-uuid-123';

  const fakeUser = {
    id: userId,
    email: 'alumna@test.com',
    password: 'hash-actual-en-bd',
  } as User;

  const changePasswordDto = {
    currentPassword: 'mi-password-actual',
    newPassword: 'nueva-segura-456',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ChangePasswordUseCase,
        {
          provide: UserGateway,
          useValue: {
            findOne: jest.fn(),
            updatePassword: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(ChangePasswordUseCase);
    userGateway = module.get(UserGateway);

    mockedBcrypt.genSalt.mockResolvedValue('new-salt' as never);
    mockedBcrypt.hash.mockResolvedValue('hashed-nueva-segura-456' as never);
  });

  // ──────────────────────────────────────────────────────────
  // 1. VALIDACIÓN: ¿El usuario existe?
  // ──────────────────────────────────────────────────────────

  /**
   * Si el userId del JWT no corresponde a un usuario real, algo está mal.
   * Posibles causas: el usuario fue eliminado, o alguien forjó un JWT.
   *
   * Debe fallar ANTES de intentar comparar contraseñas o actualizar.
   */
  it('lanza NotFoundException si el usuario no existe', async () => {
    userGateway.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(userId, changePasswordDto),
    ).rejects.toThrow(NotFoundException);

    // Ni bcrypt ni updatePassword deben haber sido llamados
    expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    expect(userGateway.updatePassword).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 2. VALIDACIÓN: ¿La contraseña actual es correcta?
  // ──────────────────────────────────────────────────────────

  /**
   * El usuario existe, pero la "contraseña actual" que envió no coincide.
   * Esto detiene a alguien que tiene la sesión abierta pero no sabe la clave.
   */
  it('lanza UnauthorizedException si la contraseña actual es incorrecta', async () => {
    userGateway.findOne.mockResolvedValue(fakeUser);
    mockedBcrypt.compare.mockResolvedValue(false as never);

    await expect(
      useCase.execute(userId, changePasswordDto),
    ).rejects.toThrow(UnauthorizedException);

    // No debe intentar guardar la nueva contraseña
    expect(userGateway.updatePassword).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 3. SEGURIDAD: la nueva contraseña se hashea
  // ──────────────────────────────────────────────────────────

  /**
   * Mismo principio que en el registro: NUNCA guardar contraseñas en texto plano.
   * Verificamos que:
   *   a) bcrypt hashea la nueva contraseña (no la actual)
   *   b) updatePassword recibe el HASH, no el texto plano
   */
  it('hashea la nueva contraseña antes de guardarla', async () => {
    userGateway.findOne.mockResolvedValue(fakeUser);
    mockedBcrypt.compare.mockResolvedValue(true as never);

    await useCase.execute(userId, changePasswordDto);

    // Debe hashear la NUEVA contraseña, no la actual
    expect(mockedBcrypt.hash).toHaveBeenCalledWith(
      'nueva-segura-456',
      'new-salt',
    );

    // updatePassword recibe el hash, no el texto plano
    expect(userGateway.updatePassword).toHaveBeenCalledWith(
      userId,
      'hashed-nueva-segura-456',
    );
  });

  // ──────────────────────────────────────────────────────────
  // 4. HAPPY PATH: cambio exitoso
  // ──────────────────────────────────────────────────────────

  /**
   * Flujo feliz:
   *   1. Usuario existe ✓
   *   2. Contraseña actual correcta ✓
   *   3. Nueva contraseña hasheada ✓
   *   4. Hash guardado en BD ✓
   *   5. No retorna nada (void) ✓
   */
  it('cambia la contraseña exitosamente cuando las validaciones pasan', async () => {
    userGateway.findOne.mockResolvedValue(fakeUser);
    mockedBcrypt.compare.mockResolvedValue(true as never);

    // execute retorna void — no debe lanzar ninguna excepción
    await expect(
      useCase.execute(userId, changePasswordDto),
    ).resolves.toBeUndefined();

    // Verifica que bcrypt.compare recibe los argumentos correctos
    expect(mockedBcrypt.compare).toHaveBeenCalledWith(
      'mi-password-actual',   // la contraseña actual del DTO
      'hash-actual-en-bd',    // el hash guardado en la BD
    );
  });
});
