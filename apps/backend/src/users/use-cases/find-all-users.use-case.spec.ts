import { Test } from '@nestjs/testing';
import { FindAllUsersUseCase } from './find-all-users.use-case';
import { UserGateway } from '../gateways/user.gateway';
import { User } from '../entities/user.entity';
import { UserRole } from '@maris-nails/shared';

/**
 * Tests para FindAllUsersUseCase — listado de todos los usuarios.
 *
 * Este Use Case es un "pass-through": solo delega al gateway sin lógica extra.
 * ¿Por qué testearlo entonces?
 *
 *   1. Documenta el comportamiento esperado (contrato)
 *   2. Si alguien agrega lógica en el futuro (filtros, paginación),
 *      los tests existentes atrapan cambios accidentales
 *   3. Verifica que retorna exactamente lo que el gateway devuelve
 *      (no transforma, no filtra, no ordena)
 */
describe('FindAllUsersUseCase', () => {
  let useCase: FindAllUsersUseCase;
  let userGateway: jest.Mocked<UserGateway>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        FindAllUsersUseCase,
        {
          provide: UserGateway,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(FindAllUsersUseCase);
    userGateway = module.get(UserGateway);
  });

  // ──────────────────────────────────────────────────────────
  // 1. Retorna la lista de usuarios del gateway
  // ──────────────────────────────────────────────────────────

  it('retorna todos los usuarios que devuelve el gateway', async () => {
    const fakeUsers = [
      { id: '1', email: 'a@test.com', fullName: 'Ana', role: UserRole.STUDENT },
      { id: '2', email: 'b@test.com', fullName: 'Beto', role: UserRole.ADMIN },
    ] as User[];

    userGateway.findAll.mockResolvedValue(fakeUsers);

    const result = await useCase.execute();

    expect(result).toBe(fakeUsers);
    expect(userGateway.findAll).toHaveBeenCalledTimes(1);
  });

  // ──────────────────────────────────────────────────────────
  // 2. Retorna array vacío si no hay usuarios
  // ──────────────────────────────────────────────────────────

  /**
   * Caso borde: base de datos vacía. El Use Case no debe fallar,
   * solo retornar un array vacío. El frontend decide cómo mostrarlo.
   */
  it('retorna array vacío si no hay usuarios registrados', async () => {
    userGateway.findAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
