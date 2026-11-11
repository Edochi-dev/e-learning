import { Test } from '@nestjs/testing';
import { LessonType } from '@maris-nails/shared';
import { SaveWatchProgressUseCase } from './save-watch-progress.use-case';
import { WatchProgressGateway } from '../../progress/gateways/watch-progress.gateway';
import { LessonProgressGateway } from '../../progress/gateways/lesson-progress.gateway';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';

describe('SaveWatchProgressUseCase', () => {
  let useCase: SaveWatchProgressUseCase;
  let watchProgress: jest.Mocked<WatchProgressGateway>;
  let lessonProgress: jest.Mocked<LessonProgressGateway>;
  let lessons: jest.Mocked<LessonGateway>;

  const userId = 'user-uuid-123';
  const lessonId = 'lesson-uuid-456';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SaveWatchProgressUseCase,
        {
          provide: WatchProgressGateway,
          useValue: { recordWatchedSegments: jest.fn() },
        },
        {
          provide: LessonProgressGateway,
          useValue: { markLessonComplete: jest.fn() },
        },
        { provide: LessonGateway, useValue: { findLesson: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(SaveWatchProgressUseCase);
    watchProgress = module.get(WatchProgressGateway);
    lessonProgress = module.get(LessonProgressGateway);
    lessons = module.get(LessonGateway);
  });

  it('suma los segmentos de la sesión y devuelve el acumulado del servidor', async () => {
    watchProgress.recordWatchedSegments.mockResolvedValue(42);

    await expect(useCase.execute(userId, lessonId, [0, 1, 2])).resolves.toEqual(
      {
        watchedPercent: 42,
        lessonCompleted: false,
      },
    );
    expect(watchProgress.recordWatchedSegments).toHaveBeenCalledWith(
      userId,
      lessonId,
      [0, 1, 2],
    );
    expect(lessonProgress.markLessonComplete).not.toHaveBeenCalled();
  });

  it('completa una clase al llegar al 95% acumulado', async () => {
    watchProgress.recordWatchedSegments.mockResolvedValue(95);
    lessons.findLesson.mockResolvedValue({ type: LessonType.CLASS } as never);

    await expect(useCase.execute(userId, lessonId, [94])).resolves.toEqual({
      watchedPercent: 95,
      lessonCompleted: true,
    });
    expect(lessonProgress.markLessonComplete).toHaveBeenCalledWith(
      userId,
      lessonId,
    );
  });

  it('no completa por debajo del umbral aunque falte un solo segmento', async () => {
    watchProgress.recordWatchedSegments.mockResolvedValue(94);

    const result = await useCase.execute(userId, lessonId, [93]);

    expect(result.lessonCompleted).toBe(false);
    expect(lessons.findLesson).not.toHaveBeenCalled();
  });

  it.each([LessonType.EXAM, LessonType.CORRECTION])(
    'nunca completa una lección de tipo %s por ver video',
    async (type) => {
      watchProgress.recordWatchedSegments.mockResolvedValue(100);
      lessons.findLesson.mockResolvedValue({ type } as never);

      const result = await useCase.execute(userId, lessonId, [99]);

      expect(result.lessonCompleted).toBe(false);
      expect(lessonProgress.markLessonComplete).not.toHaveBeenCalled();
    },
  );
});
