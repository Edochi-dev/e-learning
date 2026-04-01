import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UpdateLessonUseCase } from './update-lesson.use-case';
import { LessonGateway } from '../gateways/lesson.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { Lesson } from '../entities/lessons.entity';

/**
 * Tests para UpdateLessonUseCase — actualización con orphan cleanup y order calc.
 *
 * Después del refactor:
 *   - cleanupOrphanedFile ya no llama a isLocalFile ni replace('/static/')
 *   - Solo verifica isVideoUrlReferenced y luego delega a deleteByUrl
 *   - deleteByUrl se encarga de verificar si es local y de la ruta
 */
describe('UpdateLessonUseCase', () => {
  let useCase: UpdateLessonUseCase;
  let lessonGateway: jest.Mocked<LessonGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;

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
          provide: FileStorageGateway,
          useValue: {
            deleteByUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(UpdateLessonUseCase);
    lessonGateway = module.get(LessonGateway);
    fileStorageGateway = module.get(FileStorageGateway);
  });

  // ──────────────────────────────────────────────────────────
  // 1. VALIDACIÓN: ¿La lección existe?
  // ──────────────────────────────────────────────────────────

  it('lanza NotFoundException si la lección no existe', async () => {
    lessonGateway.findLesson.mockResolvedValue(null);

    await expect(
      useCase.execute(lessonId, { title: 'Nuevo' } as any),
    ).rejects.toThrow(NotFoundException);

    expect(lessonGateway.updateLesson).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 2. ORPHAN CLEANUP: video cambió → deleteByUrl si nadie más lo usa
  // ──────────────────────────────────────────────────────────

  it('llama a deleteByUrl para el video viejo si cambió y nadie más lo usa', async () => {
    const currentLesson = {
      id: lessonId,
      videoData: { videoUrl: '/static/videos/viejo.mp4' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(currentLesson);
    lessonGateway.isVideoUrlReferenced.mockResolvedValue(false);
    lessonGateway.updateLesson.mockResolvedValue({} as Lesson);

    await useCase.execute(lessonId, {
      videoUrl: '/static/videos/nuevo.mp4',
    } as any);

    expect(lessonGateway.isVideoUrlReferenced).toHaveBeenCalledWith(
      '/static/videos/viejo.mp4',
      lessonId,
    );
    expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
      '/static/videos/viejo.mp4',
    );
  });

  it('NO llama a deleteByUrl si otra lección referencia el video viejo', async () => {
    const currentLesson = {
      id: lessonId,
      videoData: { videoUrl: '/static/videos/compartido.mp4' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(currentLesson);
    lessonGateway.isVideoUrlReferenced.mockResolvedValue(true); // en uso
    lessonGateway.updateLesson.mockResolvedValue({} as Lesson);

    await useCase.execute(lessonId, {
      videoUrl: '/static/videos/nuevo.mp4',
    } as any);

    expect(fileStorageGateway.deleteByUrl).not.toHaveBeenCalled();
  });

  /**
   * Con deleteByUrl, el Use Case ya no necesita verificar isLocalFile.
   * Si el video viejo era de YouTube y nadie más lo referencia,
   * deleteByUrl lo ignora silenciosamente.
   */
  it('delega a deleteByUrl incluso con URLs externas (el gateway decide)', async () => {
    const currentLesson = {
      id: lessonId,
      videoData: { videoUrl: 'https://youtube.com/watch?v=abc' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(currentLesson);
    lessonGateway.isVideoUrlReferenced.mockResolvedValue(false);
    lessonGateway.updateLesson.mockResolvedValue({} as Lesson);

    await useCase.execute(lessonId, {
      videoUrl: '/static/videos/nuevo.mp4',
    } as any);

    expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
      'https://youtube.com/watch?v=abc',
    );
  });

  it('NO intenta limpiar si el videoUrl no cambió', async () => {
    const currentLesson = {
      id: lessonId,
      videoData: { videoUrl: '/static/videos/mismo.mp4' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(currentLesson);
    lessonGateway.updateLesson.mockResolvedValue({} as Lesson);

    await useCase.execute(lessonId, {
      videoUrl: '/static/videos/mismo.mp4',
    } as any);

    expect(lessonGateway.isVideoUrlReferenced).not.toHaveBeenCalled();
    expect(fileStorageGateway.deleteByUrl).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 3. ORDER CALCULATION: preguntas reciben su índice como order
  // ──────────────────────────────────────────────────────────

  it('asigna order = índice a cada pregunta antes de actualizar', async () => {
    const currentLesson = {
      id: lessonId,
      videoData: null,
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(currentLesson);
    lessonGateway.updateLesson.mockResolvedValue({} as Lesson);

    const dto = {
      title: 'Examen Final',
      questions: [
        { text: 'Pregunta A', options: [] },
        { text: 'Pregunta B', options: [] },
        { text: 'Pregunta C', options: [] },
      ],
    } as any;

    await useCase.execute(lessonId, dto);

    const data = lessonGateway.updateLesson.mock.calls[0][1];
    expect(data.questions[0].order).toBe(0);
    expect(data.questions[1].order).toBe(1);
    expect(data.questions[2].order).toBe(2);
  });
});
