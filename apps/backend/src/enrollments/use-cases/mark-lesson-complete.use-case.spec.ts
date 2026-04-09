import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MarkLessonCompleteUseCase } from './mark-lesson-complete.use-case';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { LessonProgressGateway } from '../gateways/lesson-progress.gateway';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';
import { Enrollment } from '../entities/enrollment.entity';
import { Lesson } from '../../courses/entities/lessons.entity';

/**
 * Tests para MarkLessonCompleteUseCase — marcar una lección como completada.
 *
 * Este Use Case tiene DOS checks de seguridad ANTES de guardar:
 *
 * 1. OWNERSHIP CHECK (ForbiddenException):
 *    ¿El usuario está matriculado en el curso?
 *    Sin esto, cualquier usuario autenticado podría completar lecciones
 *    de cursos que no ha comprado — como marcar páginas de un libro
 *    que no es tuyo.
 *
 * 2. EXISTENCIA (NotFoundException):
 *    ¿La lección existe?
 *    Evita crear registros de progreso para lecciones que no existen.
 *
 * El orden importa: primero ownership (seguridad), luego existencia.
 * Si un usuario no matriculado envía un lessonId inventado, queremos
 * decirle "no estás matriculado", no "lección no encontrada"
 * (no revelar qué lecciones existen).
 */
describe('MarkLessonCompleteUseCase', () => {
  let useCase: MarkLessonCompleteUseCase;
  let enrollmentGateway: jest.Mocked<EnrollmentGateway>;
  let lessonProgressGateway: jest.Mocked<LessonProgressGateway>;
  let lessonGateway: jest.Mocked<LessonGateway>;

  const userId = 'user-uuid-123';
  const lessonId = 'lesson-uuid-456';
  const courseId = 'course-uuid-789';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        MarkLessonCompleteUseCase,
        {
          provide: EnrollmentGateway,
          useValue: { findByUserAndCourse: jest.fn() },
        },
        {
          provide: LessonProgressGateway,
          useValue: { markLessonComplete: jest.fn() },
        },
        {
          provide: LessonGateway,
          useValue: { findLesson: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(MarkLessonCompleteUseCase);
    enrollmentGateway = module.get(EnrollmentGateway);
    lessonProgressGateway = module.get(LessonProgressGateway);
    lessonGateway = module.get(LessonGateway);
  });

  // ──────────────────────────────────────────────────────────
  // 1. OWNERSHIP CHECK: ¿Está matriculado?
  // ──────────────────────────────────────────────────────────

  it('lanza ForbiddenException si el usuario no está matriculado', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(null);

    await expect(useCase.execute(userId, lessonId, courseId)).rejects.toThrow(
      ForbiddenException,
    );

    // Ni siquiera busca la lección — fail fast
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(lessonGateway.findLesson).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(lessonProgressGateway.markLessonComplete).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 2. EXISTENCIA: ¿La lección existe?
  // ──────────────────────────────────────────────────────────

  it('lanza NotFoundException si la lección no existe', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({
      id: 'enrollment-1',
    } as Enrollment);
    lessonGateway.findLesson.mockResolvedValue(null);

    await expect(useCase.execute(userId, lessonId, courseId)).rejects.toThrow(
      NotFoundException,
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(lessonProgressGateway.markLessonComplete).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 3. HAPPY PATH: marca la lección como completada
  // ──────────────────────────────────────────────────────────

  it('marca la lección como completada cuando las validaciones pasan', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({
      id: 'enrollment-1',
    } as Enrollment);
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      type: 'class',
    } as unknown as Lesson);

    await useCase.execute(userId, lessonId, courseId);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(lessonProgressGateway.markLessonComplete).toHaveBeenCalledWith(
      userId,
      lessonId,
    );
  });

  // ──────────────────────────────────────────────────────────
  // 4. BLOQUEO: Las correcciones no se completan manualmente
  // ──────────────────────────────────────────────────────────

  it('lanza BadRequestException si la lección es de tipo correction', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({
      id: 'enrollment-1',
    } as Enrollment);
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      type: 'correction',
    } as unknown as Lesson);

    await expect(useCase.execute(userId, lessonId, courseId)).rejects.toThrow(
      BadRequestException,
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(lessonProgressGateway.markLessonComplete).not.toHaveBeenCalled();
  });
});
