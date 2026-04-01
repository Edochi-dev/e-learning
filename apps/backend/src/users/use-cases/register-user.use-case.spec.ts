import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { RegisterUserUseCase } from './register-user.use-case';
import { UserGateway } from '../gateways/user.gateway';
import { User } from '../entities/user.entity';
import { UserRole } from '@maris-nails/shared';

/**
 * Tests para RegisterUserUseCase — el flujo de registro de nuevos usuarios.
 *
 * ¿Qué estamos testeando aquí?
 *
 *   La LÓGICA DE NEGOCIO del registro:
 *     - ¿Rechaza emails duplicados?
 *     - ¿Hashea la contraseña? (NUNCA guardar en texto plano)
 *     - ¿Asigna el rol correcto? (siempre STUDENT, nunca ADMIN)
 *     - ¿Envía los datos correctos al gateway?
 *
 * bcrypt se mockea a nivel de módulo con jest.mock().
 * Esto reemplaza TODAS las funciones de bcrypt por jest.fn() automáticamente.
 * Luego en cada test definimos qué devuelve genSalt y hash.
 */

// Mock global de bcrypt — reemplaza el módulo completo antes de que se importe.
// Esto es necesario porque bcrypt no es un gateway inyectable,
// sino un import directo (import * as bcrypt from 'bcrypt').
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let userGateway: jest.Mocked<UserGateway>;

  // ── Datos de prueba reutilizables ──
  const validDto = {
    email: 'nueva@alumna.com',
    fullName: 'María López',
    password: 'segura123',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        RegisterUserUseCase,
        {
          provide: UserGateway,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(RegisterUserUseCase);
    userGateway = module.get(UserGateway);

    // Configuración por defecto de bcrypt para los tests que llegan al happy path.
    // genSalt devuelve un salt falso, hash devuelve un hash predecible.
    mockedBcrypt.genSalt.mockResolvedValue('fake-salt' as never);
    mockedBcrypt.hash.mockResolvedValue('hashed-segura123' as never);
  });

  // ──────────────────────────────────────────────────────────
  // 1. VALIDACIÓN: ¿El email ya está registrado?
  // ──────────────────────────────────────────────────────────

  /**
   * Si ya hay un usuario con ese email, el Use Case debe rechazar el registro.
   * Esto previene duplicados que romperían el constraint UNIQUE en la base de datos.
   *
   * Verificamos DOS cosas:
   *   a) Lanza ConflictException (HTTP 409)
   *   b) NUNCA llama a create — fail fast, no ensucia la BD
   */
  it('lanza ConflictException si el email ya está registrado', async () => {
    userGateway.findByEmail.mockResolvedValue({ id: 'existing-id' } as User);

    await expect(useCase.execute(validDto)).rejects.toThrow(ConflictException);

    expect(userGateway.create).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 2. SEGURIDAD: la contraseña se hashea con bcrypt
  // ──────────────────────────────────────────────────────────

  /**
   * Este es probablemente el test MÁS IMPORTANTE de todo el módulo de usuarios.
   *
   * Si alguien accidentalmente cambia el código y guarda la contraseña en texto
   * plano, este test falla inmediatamente. Esto protege contra:
   *   - Filtración de contraseñas en un data breach
   *   - Violación de regulaciones de protección de datos
   *
   * Verificamos que:
   *   a) bcrypt.genSalt se llama con 10 rounds (el estándar actual)
   *   b) bcrypt.hash se llama con la contraseña original + el salt
   *   c) Lo que se guarda en el gateway es el HASH, no la contraseña original
   */
  it('hashea la contraseña con bcrypt antes de guardarla', async () => {
    userGateway.findByEmail.mockResolvedValue(null);
    userGateway.create.mockResolvedValue({} as User);

    await useCase.execute(validDto);

    // Verifica que se genera un salt con 10 rounds
    expect(mockedBcrypt.genSalt).toHaveBeenCalledWith(10);

    // Verifica que se hashea la contraseña original con el salt
    expect(mockedBcrypt.hash).toHaveBeenCalledWith('segura123', 'fake-salt');

    // Verifica que el usuario que se guarda tiene el HASH, no el texto plano
    const userSaved = userGateway.create.mock.calls[0][0];
    expect(userSaved.password).toBe('hashed-segura123');
    expect(userSaved.password).not.toBe(validDto.password);
  });

  // ──────────────────────────────────────────────────────────
  // 3. REGLA DE NEGOCIO: el rol siempre es STUDENT
  // ──────────────────────────────────────────────────────────

  /**
   * Todos los usuarios que se registran deben ser STUDENT.
   * El rol ADMIN solo se asigna manualmente en la base de datos.
   *
   * ¿Por qué importa? Si alguien pudiera registrarse como ADMIN,
   * tendría acceso al panel de administración (crear cursos, ver datos, etc.)
   * — un agujero de seguridad crítico llamado "privilege escalation".
   */
  it('asigna el rol STUDENT al usuario nuevo', async () => {
    userGateway.findByEmail.mockResolvedValue(null);
    userGateway.create.mockResolvedValue({} as User);

    await useCase.execute(validDto);

    const userSaved = userGateway.create.mock.calls[0][0];
    expect(userSaved.role).toBe(UserRole.STUDENT);
  });

  // ──────────────────────────────────────────────────────────
  // 4. HAPPY PATH: registro exitoso completo
  // ──────────────────────────────────────────────────────────

  /**
   * Flujo feliz completo:
   *   1. Email no existe ✓
   *   2. Contraseña hasheada ✓
   *   3. Rol STUDENT ✓
   *   4. Gateway recibe email y fullName correctos ✓
   *   5. Retorna el usuario creado ✓
   */
  it('registra al usuario correctamente y retorna el resultado del gateway', async () => {
    const savedUser = {
      id: 'new-uuid',
      email: validDto.email,
      fullName: validDto.fullName,
      role: UserRole.STUDENT,
    } as User;

    userGateway.findByEmail.mockResolvedValue(null);
    userGateway.create.mockResolvedValue(savedUser);

    const result = await useCase.execute(validDto);

    // El Use Case retorna exactamente lo que el gateway devuelve
    expect(result).toBe(savedUser);

    // Verifica que el gateway recibió los datos correctos
    const userSaved = userGateway.create.mock.calls[0][0];
    expect(userSaved.email).toBe('nueva@alumna.com');
    expect(userSaved.fullName).toBe('María López');
  });
});
