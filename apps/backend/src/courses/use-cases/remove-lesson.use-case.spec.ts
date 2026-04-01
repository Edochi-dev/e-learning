import { Test } from '@nestjs/testing';
import { RemoveLessonUseCase } from './remove-lesson.use-case';
import { LessonGateway } from '../gateways/lesson.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { Lesson } from '../entities/lessons.entity';

/**
 * Tests para RemoveLessonUseCase — eliminación con limpieza de video huérfano.
 *
 * Misma estrategia "DB primero" que DeleteCourseUseCase, pero más simple:
 *   1. Leer videoUrl de la lección (antes de borrar)
 *   2. Borrar la lección de la DB
 *   3. Si el video es huérfano → deleteByUrl (el gateway maneja local vs externo)
 */
describe('RemoveLessonUseCase', () => {
  let useCase: RemoveLessonUseCase;
  let lessonGateway: jest.Mocked<LessonGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;

  const lessonId = 'lesson-uuid-123';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        RemoveLessonUseCase,
        {
          provide: LessonGateway,
          useValue: {
            findLesson: jest.fn(),
            removeLesson: jest.fn(),
            isVideoUrlInUse: jest.fn(),
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

    useCase = module.get(RemoveLessonUseCase);
    lessonGateway = module.get(LessonGateway);
    fileStorageGateway = module.get(FileStorageGateway);
  });

  it('borra la lección de la DB aunque no tenga video', async () => {
    const lesson = { id: lessonId, videoData: null } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(lesson);

    await useCase.execute(lessonId);

    expect(lessonGateway.removeLesson).toHaveBeenCalledWith(lessonId);
    expect(fileStorageGateway.deleteByUrl).not.toHaveBeenCalled();
  });

  it('llama a deleteByUrl para el video huérfano después de eliminar la lección', async () => {
    const lesson = {
      id: lessonId,
      videoData: { videoUrl: '/static/videos/clase.mp4' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(lesson);
    lessonGateway.isVideoUrlInUse.mockResolvedValue(false);

    await useCase.execute(lessonId);

    expect(lessonGateway.removeLesson).toHaveBeenCalledWith(lessonId);
    expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith('/static/videos/clase.mp4');
  });

  it('NO llama a deleteByUrl si otra lección sigue usando el video', async () => {
    const lesson = {
      id: lessonId,
      videoData: { videoUrl: '/static/videos/compartido.mp4' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(lesson);
    lessonGateway.isVideoUrlInUse.mockResolvedValue(true);

    await useCase.execute(lessonId);

    expect(fileStorageGateway.deleteByUrl).not.toHaveBeenCalled();
  });

  /**
   * URLs externas: el Use Case ahora pasa la URL a isVideoUrlInUse
   * sin filtrar por isLocalFile. Si es huérfana, deleteByUrl la ignora.
   */
  it('verifica referencia y delega a deleteByUrl incluso con URLs externas', async () => {
    const lesson = {
      id: lessonId,
      videoData: { videoUrl: 'https://youtube.com/video123' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(lesson);
    lessonGateway.isVideoUrlInUse.mockResolvedValue(false);

    await useCase.execute(lessonId);

    expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
      'https://youtube.com/video123',
    );
  });

  it('borra de la DB incluso si la lección no se encontró (idempotente)', async () => {
    lessonGateway.findLesson.mockResolvedValue(null);

    await useCase.execute(lessonId);

    expect(lessonGateway.removeLesson).toHaveBeenCalledWith(lessonId);
    expect(fileStorageGateway.deleteByUrl).not.toHaveBeenCalled();
  });
});
