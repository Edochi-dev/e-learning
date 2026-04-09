import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GetCourseProgressUseCase } from './get-course-progress.use-case';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { LessonProgressGateway } from '../../progress/gateways/lesson-progress.gateway';
import { WatchProgressGateway } from '../../progress/gateways/watch-progress.gateway';
import { Enrollment } from '../entities/enrollment.entity';

/**
 * Tests para GetCourseProgressUseCase — progreso detallado en un curso específico.
 *
 * A diferencia de GetMyEnrollmentsUseCase (que trae TODOS los cursos),
 * este trae el progreso detallado de UN solo curso:
 *   - completedLessonIds: array de IDs de lecciones completadas
 *   - watchProgress: { lessonId: percent } de video visto
 *
 * Usa Promise.all para ejecutar las 2 queries en PARALELO (más rápido).
 *
 * Nota: requiere matrícula activa. Si no está matriculado → 404.
 * Esto protege contra usuarios que intentan espiar el contenido de
 * un curso que no han comprado.
 */
describe('GetCourseProgressUseCase', () => {
  let useCase: GetCourseProgressUseCase;
  let enrollmentGateway: jest.Mocked<EnrollmentGateway>;
  let lessonProgressGateway: jest.Mocked<LessonProgressGateway>;
  let watchProgressGateway: jest.Mocked<WatchProgressGateway>;

  const userId = 'user-uuid-123';
  const courseId = 'course-uuid-456';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        GetCourseProgressUseCase,
        {
          provide: EnrollmentGateway,
          useValue: {
            findByUserAndCourse: jest.fn(),
          },
        },
        {
          provide: LessonProgressGateway,
          useValue: {
            getCompletedLessonIds: jest.fn(),
          },
        },
        {
          provide: WatchProgressGateway,
          useValue: {
            getWatchProgressByCourse: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(GetCourseProgressUseCase);
    enrollmentGateway = module.get(EnrollmentGateway);
    lessonProgressGateway = module.get(LessonProgressGateway);
    watchProgressGateway = module.get(WatchProgressGateway);
  });

  it('lanza NotFoundException si el usuario no está matriculado', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(null);

    await expect(useCase.execute(userId, courseId)).rejects.toThrow(
      NotFoundException,
    );

    // No debe consultar progreso si no hay matrícula
    expect(lessonProgressGateway.getCompletedLessonIds).not.toHaveBeenCalled();
    expect(watchProgressGateway.getWatchProgressByCourse).not.toHaveBeenCalled();
  });

  it('retorna completedLessonIds y watchProgress cuando está matriculado', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({
      id: 'enrollment-1',
    } as Enrollment);

    lessonProgressGateway.getCompletedLessonIds.mockResolvedValue([
      'lesson-1',
      'lesson-3',
    ]);

    watchProgressGateway.getWatchProgressByCourse.mockResolvedValue({
      'lesson-1': 100,
      'lesson-2': 45,
      'lesson-3': 100,
    });

    const result = await useCase.execute(userId, courseId);

    expect(result.completedLessonIds).toEqual(['lesson-1', 'lesson-3']);
    expect(result.watchProgress).toEqual({
      'lesson-1': 100,
      'lesson-2': 45,
      'lesson-3': 100,
    });
  });

  it('retorna datos vacíos si tiene matrícula pero no ha empezado', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({
      id: 'enrollment-1',
    } as Enrollment);

    lessonProgressGateway.getCompletedLessonIds.mockResolvedValue([]);
    watchProgressGateway.getWatchProgressByCourse.mockResolvedValue({});

    const result = await useCase.execute(userId, courseId);

    expect(result.completedLessonIds).toEqual([]);
    expect(result.watchProgress).toEqual({});
  });
});
