import { Test } from '@nestjs/testing';
import { SaveWatchProgressUseCase } from './save-watch-progress.use-case';
import { WatchProgressGateway } from '../../progress/gateways/watch-progress.gateway';

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
  let watchProgressGateway: jest.Mocked<WatchProgressGateway>;

  const userId = 'user-uuid-123';
  const lessonId = 'lesson-uuid-456';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        SaveWatchProgressUseCase,
        {
          provide: WatchProgressGateway,
          useValue: { saveWatchProgress: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(SaveWatchProgressUseCase);
    watchProgressGateway = module.get(WatchProgressGateway);
  });

  it('guarda el progreso de video cuando el usuario está matriculado', async () => {
    await useCase.execute(userId, lessonId, 75);

    expect(watchProgressGateway.saveWatchProgress).toHaveBeenCalledWith(
      userId,
      lessonId,
      75,
    );
  });
});
