import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { ApiErrorCode, UserRole } from '@maris-nails/shared';
import { EnrollmentGuard } from './enrollment.guard';
import { EnrollmentGateway } from '../../enrollments/gateways/enrollment.gateway';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { Lesson } from '../../courses/entities/lessons.entity';

/**
 * Tests del EnrollmentGuard — verifica matrícula antes de dejar pasar.
 *
 * Mockeamos ExecutionContext porque los guards de NestJS reciben un
 * contexto abstracto, no un request real. El mock simula la cadena:
 *   context.switchToHttp().getRequest() → { user, body, params, query }
 */
describe('EnrollmentGuard', () => {
  let guard: EnrollmentGuard;
  let reflector: Reflector;
  let enrollmentGateway: jest.Mocked<EnrollmentGateway>;
  let lessonGateway: jest.Mocked<LessonGateway>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EnrollmentGuard,
        Reflector,
        {
          provide: EnrollmentGateway,
          useValue: { findByUserAndCourse: jest.fn() },
        },
        {
          provide: LessonGateway,
          useValue: { findLesson: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get(EnrollmentGuard);
    reflector = module.get(Reflector);
    enrollmentGateway = module.get(EnrollmentGateway);
    lessonGateway = module.get(LessonGateway);
  });

  /**
   * El guard llama a enrollment.isActive(), así que los mocks deben ser
   * instancias reales de la entidad y no objetos literales.
   */
  function enrollment(expiresAt: Date | null = null): Enrollment {
    return Object.assign(new Enrollment(), { id: 'e-1', expiresAt });
  }

  /** Helper: crea un ExecutionContext mock con el request dado. */
  function mockContext(request: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  // ── Sin decorator → deja pasar ───────────────────────────────────

  it('deja pasar si no hay @EnrollmentCheck (sin metadata)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const ctx = mockContext({ user: { id: 'u-1' } });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  // ── ADMIN pasa sin matrícula ─────────────────────────────────────

  it('deja pasar al ADMIN aunque no esté matriculada', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      lessonIdFrom: 'params',
      lessonIdField: 'lessonId',
    });
    // Sin matrícula: si el guard consultara, rechazaría.
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(null);

    const ctx = mockContext({
      user: { id: 'admin-1', role: UserRole.ADMIN },
      body: {},
      params: { lessonId: 'l-1' },
      query: {},
    });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    // Sale antes de tocar la DB: ni resuelve la lección ni busca matrícula.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(lessonGateway.findLesson).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(enrollmentGateway.findByUserAndCourse).not.toHaveBeenCalled();
  });

  it('NO deja pasar a una alumna sin matrícula (el bypass es solo de ADMIN)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      courseIdFrom: 'body',
    });
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(null);

    const ctx = mockContext({
      user: { id: 'u-1', role: UserRole.STUDENT },
      body: { courseId: 'c-1' },
      params: {},
      query: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  // ── Sin usuario autenticado ──────────────────────────────────────

  it('lanza ForbiddenException si no hay user en el request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      courseIdFrom: 'body',
    });

    const ctx = mockContext({ body: { courseId: 'c-1' } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  // ── courseIdFrom: body ──────────────────────────────────────────

  it('verifica enrollment con courseId del body', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      courseIdFrom: 'body',
    });
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(enrollment());

    const ctx = mockContext({
      user: { id: 'u-1' },
      body: { courseId: 'c-1' },
      params: {},
      query: {},
    });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(enrollmentGateway.findByUserAndCourse).toHaveBeenCalledWith(
      'u-1',
      'c-1',
    );
  });

  // ── courseIdFrom: query ─────────────────────────────────────────

  it('verifica enrollment con courseId del query (multipart)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      courseIdFrom: 'query',
    });
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(enrollment());

    const ctx = mockContext({
      user: { id: 'u-1' },
      body: {},
      params: {},
      query: { courseId: 'c-1' },
    });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(enrollmentGateway.findByUserAndCourse).toHaveBeenCalledWith(
      'u-1',
      'c-1',
    );
  });

  // ── courseIdFrom: params ────────────────────────────────────────

  it('verifica enrollment con courseId de params', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      courseIdFrom: 'params',
    });
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(enrollment());

    const ctx = mockContext({
      user: { id: 'u-1' },
      body: {},
      params: { courseId: 'c-1' },
      query: {},
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  // ── courseId faltante ──────────────────────────────────────────

  it('lanza BadRequestException si courseId no está en la fuente', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      courseIdFrom: 'body',
    });

    const ctx = mockContext({
      user: { id: 'u-1' },
      body: {},
      params: {},
      query: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });

  // ── No matriculada ─────────────────────────────────────────────

  it('lanza ForbiddenException si no está matriculada', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      courseIdFrom: 'body',
    });
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(null);

    const ctx = mockContext({
      user: { id: 'u-1' },
      body: { courseId: 'c-1' },
      params: {},
      query: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  // ── lessonIdFrom: resolución lessonId → courseId ───────────────

  it('resuelve courseId desde lessonId via LessonGateway', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      lessonIdFrom: 'params',
      lessonIdField: 'lessonId',
    });
    lessonGateway.findLesson.mockResolvedValue({
      id: 'l-1',
      courseId: 'c-1',
    } as unknown as Lesson);
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(enrollment());

    const ctx = mockContext({
      user: { id: 'u-1' },
      body: {},
      params: { lessonId: 'l-1' },
      query: {},
    });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(lessonGateway.findLesson).toHaveBeenCalledWith('l-1');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(enrollmentGateway.findByUserAndCourse).toHaveBeenCalledWith(
      'u-1',
      'c-1',
    );
  });

  // ── Cruce lección ↔ curso declarado ────────────────────────────

  /**
   * El agujero que cierra este caso: sin la comprobación, bastaba con enviar el
   * lessonId de un curso ajeno junto al courseId de un curso propio para marcar
   * progreso y responder quizzes de contenido no comprado.
   */
  it('rechaza si la lección no pertenece al curso declarado por el cliente', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      lessonIdFrom: 'body',
      courseIdFrom: 'body',
    });
    lessonGateway.findLesson.mockResolvedValue({
      id: 'l-de-curso-ajeno',
      courseId: 'curso-no-comprado',
    } as unknown as Lesson);

    const ctx = mockContext({
      user: { id: 'u-1' },
      body: { lessonId: 'l-de-curso-ajeno', courseId: 'curso-propio' },
      params: {},
      query: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    // Ni siquiera llega a mirar la matrícula: el request es incoherente.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(enrollmentGateway.findByUserAndCourse).not.toHaveBeenCalled();
  });

  it('deja pasar cuando la lección sí pertenece al curso declarado', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      lessonIdFrom: 'body',
      courseIdFrom: 'body',
    });
    lessonGateway.findLesson.mockResolvedValue({
      id: 'l-1',
      courseId: 'c-1',
    } as unknown as Lesson);
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(enrollment());

    const ctx = mockContext({
      user: { id: 'u-1' },
      body: { lessonId: 'l-1', courseId: 'c-1' },
      params: {},
      query: {},
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  // ── Vencimiento del acceso ─────────────────────────────────────

  it('rechaza una matrícula vencida con el código ENROLLMENT_EXPIRED', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      courseIdFrom: 'body',
    });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(
      enrollment(yesterday),
    );

    const ctx = mockContext({
      user: { id: 'u-1' },
      body: { courseId: 'c-1' },
      params: {},
      query: {},
    });

    // El código distingue "se venció" de "nunca la tuvo": el frontend ofrece
    // renovar en un caso y comprar en el otro.
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: { code: ApiErrorCode.ENROLLMENT_EXPIRED },
    });
  });

  it('deja pasar una matrícula cuyo vencimiento aún no llegó', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      courseIdFrom: 'body',
    });
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(
      enrollment(tomorrow),
    );

    const ctx = mockContext({
      user: { id: 'u-1' },
      body: { courseId: 'c-1' },
      params: {},
      query: {},
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('marca NOT_ENROLLED cuando no existe matrícula', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      courseIdFrom: 'body',
    });
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(null);

    const ctx = mockContext({
      user: { id: 'u-1' },
      body: { courseId: 'c-1' },
      params: {},
      query: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: { code: ApiErrorCode.NOT_ENROLLED },
    });
  });

  it('lanza NotFoundException si la lección no existe', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      lessonIdFrom: 'params',
      lessonIdField: 'lessonId',
    });
    lessonGateway.findLesson.mockResolvedValue(null);

    const ctx = mockContext({
      user: { id: 'u-1' },
      body: {},
      params: { lessonId: 'l-no-existe' },
      query: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
  });

  it('lanza BadRequestException si lessonId falta en la fuente', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      lessonIdFrom: 'params',
      lessonIdField: 'lessonId',
    });

    const ctx = mockContext({
      user: { id: 'u-1' },
      body: {},
      params: {},
      query: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });

  // ── Configuración inválida ─────────────────────────────────────

  it('lanza BadRequestException si el decorator no tiene courseIdFrom ni lessonIdFrom', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({});

    const ctx = mockContext({
      user: { id: 'u-1' },
      body: {},
      params: {},
      query: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });
});
