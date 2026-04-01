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
 *   3. Si el video es local y huérfano → borrar archivo
 *
 * Escenarios:
 *   - Lección sin video → solo borra de DB
 *   - Video local huérfano → borra archivo
 *   - Video compartido → NO borra archivo
 *   - Video externo (YouTube) → ignora
 *   - Lección no existe (findLesson devuelve null) → borra igual
 *     (podría ya estar eliminada por cascade, el removeLesson es idempotente)
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
            isLocalFile: jest.fn(),
            deleteFile: jest.fn(),
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
    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();
  });

  it('borra el video local huérfano después de eliminar la lección', async () => {
    const lesson = {
      id: lessonId,
      videoData: { videoUrl: '/static/videos/clase.mp4' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(lesson);
    fileStorageGateway.isLocalFile.mockReturnValue(true);
    lessonGateway.isVideoUrlInUse.mockResolvedValue(false);

    await useCase.execute(lessonId);

    // DB primero
    expect(lessonGateway.removeLesson).toHaveBeenCalledWith(lessonId);
    // Archivo después
    expect(fileStorageGateway.deleteFile).toHaveBeenCalledWith('videos/clase.mp4');
  });

  it('NO borra el video si otra lección lo sigue usando', async () => {
    const lesson = {
      id: lessonId,
      videoData: { videoUrl: '/static/videos/compartido.mp4' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(lesson);
    fileStorageGateway.isLocalFile.mockReturnValue(true);
    lessonGateway.isVideoUrlInUse.mockResolvedValue(true);

    await useCase.execute(lessonId);

    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();
  });

  it('ignora videos con URLs externas (YouTube, etc.)', async () => {
    const lesson = {
      id: lessonId,
      videoData: { videoUrl: 'https://youtube.com/video123' },
    } as unknown as Lesson;

    lessonGateway.findLesson.mockResolvedValue(lesson);
    fileStorageGateway.isLocalFile.mockReturnValue(false);

    await useCase.execute(lessonId);

    expect(lessonGateway.isVideoUrlInUse).not.toHaveBeenCalled();
    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();
  });

  it('borra de la DB incluso si la lección no se encontró (idempotente)', async () => {
    lessonGateway.findLesson.mockResolvedValue(null);

    await useCase.execute(lessonId);

    expect(lessonGateway.removeLesson).toHaveBeenCalledWith(lessonId);
    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();
  });
});
