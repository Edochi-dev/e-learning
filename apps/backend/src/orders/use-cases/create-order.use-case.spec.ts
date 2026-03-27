import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CreateOrderUseCase } from './create-order.use-case';
import { OrderGateway } from '../gateways/order.gateway';
import { PaymentGateway } from '../gateways/payment.gateway';
import { CourseGateway } from '../../courses/gateways/course.gateway';
import { EnrollmentGateway } from '../../enrollments/gateways/enrollment.gateway';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '@maris-nails/shared';

/**
 * Tests para CreateOrderUseCase — el Use Case más importante del módulo de órdenes.
 *
 * ¿Qué estamos testeando aquí?
 *
 *   NO testeamos la base de datos, ni HTTP, ni Stripe.
 *   Testeamos la LÓGICA DE NEGOCIO pura:
 *     - ¿Valida que el curso exista?
 *     - ¿Evita compras duplicadas?
 *     - ¿Congela el precio correctamente?
 *     - ¿Matricula al usuario cuando el pago es exitoso?
 *     - ¿NO matricula cuando el pago falla?
 *
 * Para lograr esto, usamos MOCKS: objetos falsos que simulan el comportamiento
 * de los gateways reales. Así podemos controlar exactamente qué devuelve cada
 * dependencia y verificar que el Use Case reacciona correctamente.
 *
 * Patrón usado: Test.createTestingModule de NestJS.
 * Esto crea un mini-contenedor de inyección de dependencias solo para el test,
 * donde cada gateway abstracto se reemplaza por un objeto con métodos jest.fn().
 */
describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let orderGateway: jest.Mocked<OrderGateway>;
  let paymentGateway: jest.Mocked<PaymentGateway>;
  let courseGateway: jest.Mocked<CourseGateway>;
  let enrollmentGateway: jest.Mocked<EnrollmentGateway>;

  // ── Datos de prueba reutilizables ──
  // Usamos objetos parciales con "as" para no tener que definir TODAS las propiedades
  // de la entidad. En un test unitario, solo nos interesan los campos que el Use Case usa.
  const userId = 'user-uuid-123';
  const courseId = 'course-uuid-456';

  const fakeCourse = {
    id: courseId,
    title: 'Manicure Básico',
    price: 50,
  };

  const fakeOrder = {
    id: 'order-uuid-789',
    userId,
    courseId,
    amount: 50,
    status: OrderStatus.PENDING,
  } as Order;

  /**
   * beforeEach — Se ejecuta ANTES de cada test individual.
   *
   * ¿Por qué recreamos todo el módulo en cada test?
   *   Para que los mocks estén limpios. Si un test anterior hizo que
   *   courseGateway.findOne devolviera null, eso no debe afectar al siguiente test.
   *   jest.clearAllMocks() limpia los contadores y valores de retorno.
   */
  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        CreateOrderUseCase,
        // Cada gateway abstracto se reemplaza por un objeto con métodos mock.
        // Solo listamos los métodos que el Use Case realmente llama.
        {
          provide: OrderGateway,
          useValue: {
            create: jest.fn(),
            findCompletedByUserAndCourse: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
        {
          provide: PaymentGateway,
          useValue: {
            processPayment: jest.fn(),
          },
        },
        {
          provide: CourseGateway,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: EnrollmentGateway,
          useValue: {
            findByUserAndCourse: jest.fn(),
            enroll: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(CreateOrderUseCase);
    orderGateway = module.get(OrderGateway);
    paymentGateway = module.get(PaymentGateway);
    courseGateway = module.get(CourseGateway);
    enrollmentGateway = module.get(EnrollmentGateway);
  });

  // ──────────────────────────────────────────────────────────
  // 1. VALIDACIÓN: ¿Existe el curso?
  // ──────────────────────────────────────────────────────────

  /**
   * Si el curso no existe, el Use Case debe fallar ANTES de crear la orden.
   * Esto evita órdenes huérfanas (sin curso asociado) en la base de datos.
   *
   * Verificamos dos cosas:
   *   a) Lanza NotFoundException con el mensaje correcto.
   *   b) NO llama a orderGateway.create (no se creó ninguna orden basura).
   */
  it('lanza NotFoundException si el curso no existe', async () => {
    courseGateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute(userId, courseId)).rejects.toThrow(
      NotFoundException,
    );

    // Verificamos que la orden NUNCA se creó — fail fast.
    expect(orderGateway.create).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 2. VALIDACIÓN: ¿El usuario ya compró este curso?
  // ──────────────────────────────────────────────────────────

  /**
   * Si ya existe una orden COMPLETED para este usuario+curso, no tiene sentido
   * permitir otra compra. El Use Case lanza ConflictException.
   *
   * Nota: órdenes FAILED sí permiten reintentar (por eso la query busca solo completed).
   */
  it('lanza ConflictException si el usuario ya tiene una orden completada para ese curso', async () => {
    courseGateway.findOne.mockResolvedValue(fakeCourse as any);
    orderGateway.findCompletedByUserAndCourse.mockResolvedValue(fakeOrder);

    await expect(useCase.execute(userId, courseId)).rejects.toThrow(
      ConflictException,
    );

    // No debe crear una nueva orden si ya compró el curso.
    expect(orderGateway.create).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 3. PRECIO CONGELADO: la orden usa el precio del curso
  // ──────────────────────────────────────────────────────────

  /**
   * "Price freezing" — La orden debe registrar el precio del curso AL MOMENTO
   * DE LA COMPRA. Si mañana el curso sube de $50 a $70, la orden de hoy
   * sigue diciendo $50.
   *
   * Esto se verifica asegurando que orderGateway.create recibe course.price
   * como amount, no un valor hardcodeado ni un parámetro externo.
   */
  it('crea la orden con el precio congelado del curso (price freezing)', async () => {
    const courseConPrecio = { ...fakeCourse, price: 99.99 };
    courseGateway.findOne.mockResolvedValue(courseConPrecio as any);
    orderGateway.findCompletedByUserAndCourse.mockResolvedValue(null);
    orderGateway.create.mockResolvedValue({
      ...fakeOrder,
      amount: 99.99,
    } as Order);
    paymentGateway.processPayment.mockResolvedValue({ success: true });
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(null);
    enrollmentGateway.enroll.mockResolvedValue({} as any);

    await useCase.execute(userId, courseId);

    // El amount en la orden DEBE ser el precio del curso, no otro valor.
    expect(orderGateway.create).toHaveBeenCalledWith({
      userId,
      courseId,
      amount: 99.99,
      status: OrderStatus.PENDING,
    });
  });

  /**
   * Complemento del test anterior: verificamos que el PaymentGateway también
   * recibe el precio del curso. No queremos cobrar un monto diferente al registrado.
   */
  it('el monto enviado al PaymentGateway coincide con course.price', async () => {
    const courseConPrecio = { ...fakeCourse, price: 75 };
    courseGateway.findOne.mockResolvedValue(courseConPrecio as any);
    orderGateway.findCompletedByUserAndCourse.mockResolvedValue(null);
    orderGateway.create.mockResolvedValue({ ...fakeOrder, amount: 75 } as Order);
    paymentGateway.processPayment.mockResolvedValue({ success: true });
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(null);
    enrollmentGateway.enroll.mockResolvedValue({} as any);

    await useCase.execute(userId, courseId);

    expect(paymentGateway.processPayment).toHaveBeenCalledWith(
      userId,
      courseId,
      75, // <- mismo precio que course.price
    );
  });

  // ──────────────────────────────────────────────────────────
  // 4. PAGO EXITOSO: orden completed + matrícula automática
  // ──────────────────────────────────────────────────────────

  /**
   * Flujo feliz completo:
   *   1. Curso existe ✓
   *   2. No hay orden previa ✓
   *   3. Se crea la orden en pending ✓
   *   4. Pago exitoso ✓
   *   5. Orden pasa a completed ✓
   *   6. Se matricula al usuario ✓
   *
   * Este test verifica TODO el camino feliz de punta a punta.
   */
  it('cuando el pago es exitoso: orden pasa a completed y el usuario se matricula', async () => {
    courseGateway.findOne.mockResolvedValue(fakeCourse as any);
    orderGateway.findCompletedByUserAndCourse.mockResolvedValue(null);
    orderGateway.create.mockResolvedValue({ ...fakeOrder });
    paymentGateway.processPayment.mockResolvedValue({ success: true });
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(null);
    enrollmentGateway.enroll.mockResolvedValue({} as any);

    const result = await useCase.execute(userId, courseId);

    // La orden debe terminar en COMPLETED
    expect(result.status).toBe(OrderStatus.COMPLETED);
    expect(orderGateway.updateStatus).toHaveBeenCalledWith(
      fakeOrder.id,
      OrderStatus.COMPLETED,
    );

    // El usuario debe quedar matriculado automáticamente
    expect(enrollmentGateway.enroll).toHaveBeenCalledWith(userId, courseId);
  });

  // ──────────────────────────────────────────────────────────
  // 5. PAGO FALLIDO: orden failed + NO se matricula
  // ──────────────────────────────────────────────────────────

  /**
   * Si el pago falla (ej: tarjeta rechazada, fondos insuficientes):
   *   - La orden debe quedar en 'failed'
   *   - El usuario NO debe ser matriculado
   *
   * Esto es crítico: si matriculáramos al usuario con un pago fallido,
   * estaríamos regalando el curso. Un bug aquí = pérdida de dinero.
   */
  it('cuando el pago falla: orden pasa a failed y el usuario NO se matricula', async () => {
    courseGateway.findOne.mockResolvedValue(fakeCourse as any);
    orderGateway.findCompletedByUserAndCourse.mockResolvedValue(null);
    orderGateway.create.mockResolvedValue({ ...fakeOrder });
    paymentGateway.processPayment.mockResolvedValue({
      success: false,
      reason: 'Fondos insuficientes',
    });

    const result = await useCase.execute(userId, courseId);

    // La orden debe terminar en FAILED
    expect(result.status).toBe(OrderStatus.FAILED);
    expect(orderGateway.updateStatus).toHaveBeenCalledWith(
      fakeOrder.id,
      OrderStatus.FAILED,
    );

    // NUNCA debe intentar matricular al usuario
    expect(enrollmentGateway.findByUserAndCourse).not.toHaveBeenCalled();
    expect(enrollmentGateway.enroll).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 6. MATRÍCULA PREEXISTENTE: no duplica el enrollment
  // ──────────────────────────────────────────────────────────

  /**
   * Caso borde: un admin le dio acceso gratuito al usuario (Enrollment sin Order).
   * Luego el usuario decide comprar el curso oficialmente.
   *
   * El pago es exitoso, pero como ya tiene enrollment, el Use Case
   * NO debe llamar a enroll() de nuevo. Esto evita:
   *   - Errores de constraint UNIQUE en la base de datos
   *   - Que se resetee la fecha de matrícula original
   */
  it('si el usuario ya tiene matrícula previa, no intenta matricularlo de nuevo', async () => {
    courseGateway.findOne.mockResolvedValue(fakeCourse as any);
    orderGateway.findCompletedByUserAndCourse.mockResolvedValue(null);
    orderGateway.create.mockResolvedValue({ ...fakeOrder });
    paymentGateway.processPayment.mockResolvedValue({ success: true });

    // Simula que el usuario YA tiene una matrícula (ej: admin la creó manualmente)
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({
      id: 'enrollment-existente',
    } as any);

    const result = await useCase.execute(userId, courseId);

    // La orden se completa normalmente...
    expect(result.status).toBe(OrderStatus.COMPLETED);

    // ...pero enroll() NUNCA se llama porque ya existía la matrícula.
    expect(enrollmentGateway.enroll).not.toHaveBeenCalled();
  });
});
