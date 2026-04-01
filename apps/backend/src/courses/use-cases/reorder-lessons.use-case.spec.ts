import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ReorderLessonsUseCase } from './reorder-lessons.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { LessonGateway } from '../gateways/lesson.gateway';
import { Course } from '../entities/course.entity';

/**
 * Tests para ReorderLessonsUseCase — reordenamiento con validación estricta.
 *
 * Este Use Case valida que el array de lessonIds cumpla DOS condiciones:
 *   1. Todos los IDs pertenecen al curso (no hay IDs inventados)
 *   2. El array tiene exactamente la misma cantidad de lecciones que el curso
 *      (no se omiten lecciones)
 *
 * ¿Por qué tanta validación? Porque el frontend envía el orden nuevo,
 * y si aceptáramos cualquier array, podríamos:
 *   - Asignar orden a lecciones de OTRO curso (IDs inventados)
 *   - Perder lecciones que no fueron incluidas en el array
 */
describe('ReorderLessonsUseCase', () => {
  let useCase: ReorderLessonsUseCase;
  let courseGateway: jest.Mocked<CourseGateway>;
  let lessonGateway: jest.Mocked<LessonGateway>;

  const courseId = 'course-uuid-123';

  // Curso con 3 lecciones en orden original
  const courseWithLessons = {
    id: courseId,
    lessons: [
      { id: 'lesson-A' },
      { id: 'lesson-B' },
      { id: 'lesson-C' },
    ],
  } as unknown as Course;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ReorderLessonsUseCase,
        {
          provide: CourseGateway,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: LessonGateway,
          useValue: { reorderLessons: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(ReorderLessonsUseCase);
    courseGateway = module.get(CourseGateway);
    lessonGateway = module.get(LessonGateway);
  });

  it('lanza NotFoundException si el curso no existe', async () => {
    courseGateway.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(courseId, ['lesson-A']),
    ).rejects.toThrow(NotFoundException);

    expect(lessonGateway.reorderLessons).not.toHaveBeenCalled();
  });

  /**
   * Si el frontend envía un ID que no pertenece al curso (ej: typo, otro curso,
   * o un atacante intentando manipular lecciones ajenas), rechazamos.
   */
  it('lanza BadRequestException si un lessonId no pertenece al curso', async () => {
    courseGateway.findOne.mockResolvedValue(courseWithLessons);

    await expect(
      useCase.execute(courseId, ['lesson-A', 'lesson-B', 'INVENTADO']),
    ).rejects.toThrow(BadRequestException);

    expect(lessonGateway.reorderLessons).not.toHaveBeenCalled();
  });

  /**
   * Si el frontend omite una lección (ej: bug en el drag & drop),
   * el conteo no coincide y rechazamos.
   * Sin esta validación, la lección omitida quedaría con un order stale.
   */
  it('lanza BadRequestException si faltan lecciones en el array', async () => {
    courseGateway.findOne.mockResolvedValue(courseWithLessons);

    // Solo 2 de 3 lecciones — falta lesson-C
    await expect(
      useCase.execute(courseId, ['lesson-A', 'lesson-B']),
    ).rejects.toThrow(BadRequestException);

    expect(lessonGateway.reorderLessons).not.toHaveBeenCalled();
  });

  it('reordena cuando el array contiene exactamente las mismas lecciones', async () => {
    courseGateway.findOne.mockResolvedValue(courseWithLessons);

    // Nuevo orden: C, A, B (las 3, pero reordenadas)
    const newOrder = ['lesson-C', 'lesson-A', 'lesson-B'];

    await useCase.execute(courseId, newOrder);

    expect(lessonGateway.reorderLessons).toHaveBeenCalledWith(courseId, newOrder);
  });
});
