import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UpdateLessonUseCase } from './update-lesson.use-case';
import { LessonGateway } from '../gateways/lesson.gateway';
import { OrphanFileCleaner } from '../../storage/services/orphan-file-cleaner.service';
import { Lesson } from '../entities/lessons.entity';
import { UpdateLessonDto } from '../dto/update-lesson.dto';

/**
 * Tests para UpdateLessonUseCase.
 *
 * Después del refactor, la limpieza de huérfanos vive en OrphanFileCleaner.
 * El use case solo decide CUÁNDO invocarlo y con qué checker. Por eso aquí
 * mockeamos el cleaner y verificamos:
 *   1. Que se invoca con la URL vieja cuando el video cambia.
 *   2. Que el checker pasado consulta isVideoUrlReferenced excluyendo
 *      la lección actual.
 */
describe('UpdateLessonUseCase', () => {
  let useCase: UpdateLessonUseCase;
  let lessonGateway: jest.Mocked<LessonGateway>;
  let orphanFileCleaner: jest.Mocked<OrphanFileCleaner>;

  const lessonId = 'lesson-uuid-123';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        UpdateLessonUseCase,
        {
          provide: LessonGateway,
          useValue: {
            findLesson: jest.fn(),
            updateLesson: jest.fn(),
            isVideoUrlReferenced: jest.fn(),
          },
        },
        {
          provide: OrphanFileCleaner,
          useValue: {
            deleteIfOrphan: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(UpdateLessonUseCase);
    lessonGateway = module.get(LessonGateway);
    orphanFileCleaner = module.get(OrphanFileCleaner);
  });

  it('lanza NotFoundException si la lección no existe', async () => {
    lessonGateway.findLesson.mockResolvedValue(null);

    const dto = Object.assign(new UpdateLessonDto(), { title: 'Nuevo' });

    await expect(useCase.execute(lessonId, dto)).rejects.toThrow(
      NotFoundException,
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(lessonGateway.updateLesson).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(orphanFileCleaner.deleteIfOrphan).not.toHaveBeenCalled();
  });

  it('invoca al cleaner con la URL vieja cuando el videoUrl cambia', async () => {
    const currentLesson = {
      id: lessonId,
      type: 'class',
      videoData: { videoUrl: '/static/videos/viejo.mp4' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(currentLesson);
    lessonGateway.updateLesson.mockResolvedValue({} as Lesson);

    const dto = Object.assign(new UpdateLessonDto(), {
      videoUrl: '/static/videos/nuevo.mp4',
    });

    await useCase.execute(lessonId, dto);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(orphanFileCleaner.deleteIfOrphan).toHaveBeenCalledWith(
      '/static/videos/viejo.mp4',
      expect.any(Function),
    );
  });

  it('el checker excluye a la lección actual al consultar isVideoUrlReferenced', async () => {
    const currentLesson = {
      id: lessonId,
      type: 'class',
      videoData: { videoUrl: '/static/videos/viejo.mp4' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(currentLesson);
    lessonGateway.isVideoUrlReferenced.mockResolvedValue(true);
    lessonGateway.updateLesson.mockResolvedValue({} as Lesson);

    const dto = Object.assign(new UpdateLessonDto(), {
      videoUrl: '/static/videos/nuevo.mp4',
    });

    await useCase.execute(lessonId, dto);

    const checker = orphanFileCleaner.deleteIfOrphan.mock.calls[0][1];
    const result = await checker();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(lessonGateway.isVideoUrlReferenced).toHaveBeenCalledWith(
      '/static/videos/viejo.mp4',
      lessonId,
    );
    expect(result).toBe(true);
  });

  it('NO invoca al cleaner si el videoUrl no cambió', async () => {
    const currentLesson = {
      id: lessonId,
      type: 'class',
      videoData: { videoUrl: '/static/videos/mismo.mp4' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(currentLesson);
    lessonGateway.updateLesson.mockResolvedValue({} as Lesson);

    const dto = Object.assign(new UpdateLessonDto(), {
      videoUrl: '/static/videos/mismo.mp4',
    });

    await useCase.execute(lessonId, dto);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(orphanFileCleaner.deleteIfOrphan).not.toHaveBeenCalled();
  });

  it('asigna order = índice a cada pregunta antes de actualizar', async () => {
    const currentLesson = {
      id: lessonId,
      type: 'exam',
      videoData: null,
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(currentLesson);
    lessonGateway.updateLesson.mockResolvedValue({} as Lesson);

    const dto = Object.assign(new UpdateLessonDto(), {
      title: 'Examen Final',
      questions: [
        { text: 'Pregunta A', options: [] },
        { text: 'Pregunta B', options: [] },
        { text: 'Pregunta C', options: [] },
      ],
    });

    await useCase.execute(lessonId, dto);

    const data = lessonGateway.updateLesson.mock.calls[0][1];
    expect(data.type).toBe('exam');
    if (data.type === 'exam') {
      expect(data.questions![0].order).toBe(0);
      expect(data.questions![1].order).toBe(1);
      expect(data.questions![2].order).toBe(2);
    }
  });
});
