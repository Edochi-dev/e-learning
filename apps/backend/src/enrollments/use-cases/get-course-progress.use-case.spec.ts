import { Test } from '@nestjs/testing';
import { GetCourseProgressUseCase } from './get-course-progress.use-case';
import { LessonProgressGateway } from '../../progress/gateways/lesson-progress.gateway';
import { WatchProgressGateway } from '../../progress/gateways/watch-progress.gateway';

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
    lessonProgressGateway = module.get(LessonProgressGateway);
    watchProgressGateway = module.get(WatchProgressGateway);
  });

  it('retorna completedLessonIds y watchProgress cuando está matriculado', async () => {
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
    lessonProgressGateway.getCompletedLessonIds.mockResolvedValue([]);
    watchProgressGateway.getWatchProgressByCourse.mockResolvedValue({});

    const result = await useCase.execute(userId, courseId);

    expect(result.completedLessonIds).toEqual([]);
    expect(result.watchProgress).toEqual({});
  });
});
