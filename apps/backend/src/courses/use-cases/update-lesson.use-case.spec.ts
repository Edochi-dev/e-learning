import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UpdateLessonUseCase } from './update-lesson.use-case';
import { LessonGateway } from '../gateways/lesson.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { Lesson } from '../entities/lessons.entity';

/**
 * Tests para UpdateLessonUseCase — actualización con orphan cleanup y order calc.
 *
 * Este Use Case tiene dos responsabilidades:
 *
 * 1. ORPHAN CLEANUP: si el admin cambia el video de una lección,
 *    el video viejo podría quedar huérfano (nadie lo usa). El Use Case:
 *    a) Verifica que el video viejo es local (no YouTube)
 *    b) Verifica que ninguna otra lección lo referencia
 *    c) Si es huérfano → borra del disco
 *
 * 2. ORDER CALCULATION: el frontend envía las preguntas del quiz en el
 *    orden correcto, pero sin un campo `order`. Este Use Case calcula
 *    el order basándose en el índice del array: [0, 1, 2, ...]
 *    Así la DB siempre devuelve las preguntas en el mismo orden.
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
            isLocalFile: jest.fn(),
            deleteFile: jest.fn(),
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
  // 2. ORPHAN CLEANUP: video cambió → borra el viejo si es huérfano
  // ──────────────────────────────────────────────────────────

  it('borra el video viejo si cambió, es local, y nadie más lo usa', async () => {
    const currentLesson = {
      id: lessonId,
      videoData: { videoUrl: '/static/videos/viejo.mp4' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(currentLesson);
    fileStorageGateway.isLocalFile.mockReturnValue(true);
    lessonGateway.isVideoUrlReferenced.mockResolvedValue(false);
    lessonGateway.updateLesson.mockResolvedValue({} as Lesson);

    await useCase.execute(lessonId, {
      videoUrl: '/static/videos/nuevo.mp4',
    } as any);

    // Verifica que la verificación excluye la lección actual
    expect(lessonGateway.isVideoUrlReferenced).toHaveBeenCalledWith(
      '/static/videos/viejo.mp4',
      lessonId,
    );

    expect(fileStorageGateway.deleteFile).toHaveBeenCalledWith('videos/viejo.mp4');
  });

  it('NO borra el video viejo si otra lección lo referencia', async () => {
    const currentLesson = {
      id: lessonId,
      videoData: { videoUrl: '/static/videos/compartido.mp4' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(currentLesson);
    fileStorageGateway.isLocalFile.mockReturnValue(true);
    lessonGateway.isVideoUrlReferenced.mockResolvedValue(true); // en uso
    lessonGateway.updateLesson.mockResolvedValue({} as Lesson);

    await useCase.execute(lessonId, {
      videoUrl: '/static/videos/nuevo.mp4',
    } as any);

    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();
  });

  it('NO intenta limpiar si el video viejo es una URL externa', async () => {
    const currentLesson = {
      id: lessonId,
      videoData: { videoUrl: 'https://youtube.com/watch?v=abc' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(currentLesson);
    fileStorageGateway.isLocalFile.mockReturnValue(false);
    lessonGateway.updateLesson.mockResolvedValue({} as Lesson);

    await useCase.execute(lessonId, {
      videoUrl: '/static/videos/nuevo.mp4',
    } as any);

    expect(lessonGateway.isVideoUrlReferenced).not.toHaveBeenCalled();
    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();
  });

  it('NO intenta limpiar si el videoUrl no cambió', async () => {
    const currentLesson = {
      id: lessonId,
      videoData: { videoUrl: '/static/videos/mismo.mp4' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(currentLesson);
    lessonGateway.updateLesson.mockResolvedValue({} as Lesson);

    // Enviamos el mismo videoUrl que ya tenía
    await useCase.execute(lessonId, {
      videoUrl: '/static/videos/mismo.mp4',
    } as any);

    expect(fileStorageGateway.isLocalFile).not.toHaveBeenCalled();
    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 3. ORDER CALCULATION: preguntas reciben su índice como order
  // ──────────────────────────────────────────────────────────

  /**
   * El frontend envía: [{ text: "P1" }, { text: "P2" }, { text: "P3" }]
   * El Use Case calcula: [{ text: "P1", order: 0 }, { text: "P2", order: 1 }, ...]
   *
   * Esto garantiza que la DB devuelva las preguntas en el mismo orden
   * que el admin las organizó en el panel.
   */
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
