import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SaveWatchProgressUseCase } from './save-watch-progress.use-case';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { WatchProgressGateway } from '../../progress/gateways/watch-progress.gateway';
import { Enrollment } from '../entities/enrollment.entity';

/**
 * Tests para SaveWatchProgressUseCase — guardar porcentaje de video visto.
 *
 * Mismo patrón de ownership check que MarkLessonCompleteUseCase:
 * verificar matrícula antes de guardar cualquier dato de progreso.
 *
 * Sin este check, un usuario podría:
 *   1. Averiguar lessonIds de cursos premium (por inspección de red)
 *   2. Guardar progreso falso sin haber comprado el curso
 */
describe('SaveWatchProgressUseCase', () => {
  let useCase: SaveWatchProgressUseCase;
  let enrollmentGateway: jest.Mocked<EnrollmentGateway>;
  let watchProgressGateway: jest.Mocked<WatchProgressGateway>;

  const userId = 'user-uuid-123';
  const lessonId = 'lesson-uuid-456';
  const courseId = 'course-uuid-789';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        SaveWatchProgressUseCase,
        {
          provide: EnrollmentGateway,
          useValue: { findByUserAndCourse: jest.fn() },
        },
        {
          provide: WatchProgressGateway,
          useValue: { saveWatchProgress: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(SaveWatchProgressUseCase);
    enrollmentGateway = module.get(EnrollmentGateway);
    watchProgressGateway = module.get(WatchProgressGateway);
  });

  it('lanza NotFoundException si el usuario no está matriculado', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(null);

    await expect(
      useCase.execute(userId, lessonId, courseId, 75),
    ).rejects.toThrow(NotFoundException);

    expect(watchProgressGateway.saveWatchProgress).not.toHaveBeenCalled();
  });

  it('guarda el progreso de video cuando el usuario está matriculado', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({
      id: 'enrollment-1',
    } as Enrollment);

    await useCase.execute(userId, lessonId, courseId, 75);

    expect(watchProgressGateway.saveWatchProgress).toHaveBeenCalledWith(
      userId,
      lessonId,
      75,
    );
  });
});
