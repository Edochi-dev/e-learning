import { Test } from '@nestjs/testing';
import { GetMyOrdersUseCase } from './get-my-orders.use-case';
import { OrderGateway } from '../gateways/order.gateway';
import { Order } from '../entities/order.entity';

/**
 * Test de GetMyOrdersUseCase
 *
 * Este Use Case es muy sencillo: solo delega al OrderGateway.
 * Entonces, ¿por qué testearlo? Porque el test verifica el CONTRATO:
 *
 *   - Que el Use Case llama al gateway con el userId correcto.
 *   - Que retorna exactamente lo que el gateway devuelve (sin transformar).
 *   - Que si no hay órdenes, retorna un array vacío (no null, no undefined).
 *
 * Si mañana agregas lógica (filtrar por fecha, paginar), estos tests
 * te protegen de romper el comportamiento base.
 */
describe('GetMyOrdersUseCase', () => {
  let useCase: GetMyOrdersUseCase;
  let orderGateway: jest.Mocked<OrderGateway>;

  // ── Datos de prueba ──
  // Simulamos dos órdenes ya ordenadas de más reciente a más antigua,
  // tal como las devolvería el gateway real (ver order.gateway.ts).
  const fakeUserId = 'user-uuid-123';

  const fakeOrders: Order[] = [
    {
      id: 'order-2',
      userId: fakeUserId,
      courseId: 'course-abc',
      amount: 70,
      status: 'completed',
      createdAt: new Date('2026-03-20'),
    } as Order,
    {
      id: 'order-1',
      userId: fakeUserId,
      courseId: 'course-xyz',
      amount: 50,
      status: 'completed',
      createdAt: new Date('2026-03-15'),
    } as Order,
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    /**
     * Test.createTestingModule simula el módulo de NestJS.
     * En vez de inyectar el repositorio real (que necesita BD),
     * inyectamos un objeto con métodos mock (jest.fn()).
     *
     * Solo mockeamos findByUser porque es el ÚNICO método que
     * este Use Case utiliza. No necesitamos create, findById, etc.
     */
    const module = await Test.createTestingModule({
      providers: [
        GetMyOrdersUseCase,
        {
          provide: OrderGateway,
          useValue: { findByUser: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetMyOrdersUseCase);
    orderGateway = module.get(OrderGateway);
  });

  // ── Test 1: Array vacío cuando el usuario no tiene órdenes ──
  it('retorna un array vacío cuando el usuario no tiene órdenes', async () => {
    // Arrange: el gateway devuelve un array vacío (usuario sin compras)
    orderGateway.findByUser.mockResolvedValue([]);

    // Act
    const result = await useCase.execute(fakeUserId);

    // Assert: debe ser un array vacío, NO null ni undefined
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  // ── Test 2: Retorna órdenes y verifica que se llame con el userId correcto ──
  it('retorna las órdenes del usuario y llama al gateway con el userId correcto', async () => {
    // Arrange: el gateway devuelve las órdenes fake (ya ordenadas por fecha)
    orderGateway.findByUser.mockResolvedValue(fakeOrders);

    // Act
    const result = await useCase.execute(fakeUserId);

    // Assert: el gateway recibe exactamente el userId que le pasamos
    expect(orderGateway.findByUser).toHaveBeenCalledWith(fakeUserId);
    expect(orderGateway.findByUser).toHaveBeenCalledTimes(1);

    // La orden más reciente (2026-03-20) viene primero
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('order-2');
    expect(result[1].id).toBe('order-1');
  });

  // ── Test 3: Delega correctamente al gateway (sin transformar datos) ──
  it('delega al gateway y retorna su resultado sin transformación', async () => {
    // Arrange: el gateway devuelve las órdenes tal cual
    orderGateway.findByUser.mockResolvedValue(fakeOrders);

    // Act
    const result = await useCase.execute(fakeUserId);

    // Assert: el resultado es EXACTAMENTE lo que devolvió el gateway.
    // Esto verifica que el Use Case no modifica, filtra ni re-ordena nada.
    expect(result).toBe(fakeOrders);
  });
});
