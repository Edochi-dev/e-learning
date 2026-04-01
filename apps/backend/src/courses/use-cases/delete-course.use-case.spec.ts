import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeleteCourseUseCase } from './delete-course.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { LessonGateway } from '../gateways/lesson.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { Course } from '../entities/course.entity';

/**
 * Tests para DeleteCourseUseCase — eliminación con limpieza de archivos huérfanos.
 *
 * Este es el Use Case más complejo del módulo porque coordina:
 *   - Lectura del curso (para anotar rutas ANTES de borrar)
 *   - Borrado en cascada de la DB
 *   - Limpieza best-effort de videos y thumbnail via deleteByUrl
 *
 * Después del refactor, el Use Case ya no sabe cómo se estructuran las URLs
 * del storage ("/static/" etc.). Delega eso a deleteByUrl del gateway.
 */
describe('DeleteCourseUseCase', () => {
  let useCase: DeleteCourseUseCase;
  let courseGateway: jest.Mocked<CourseGateway>;
  let lessonGateway: jest.Mocked<LessonGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;

  const courseId = 'course-uuid-123';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        DeleteCourseUseCase,
        {
          provide: CourseGateway,
          useValue: {
            findOne: jest.fn(),
            delete: jest.fn(),
            isThumbnailUrlInUse: jest.fn(),
          },
        },
        {
          provide: LessonGateway,
          useValue: {
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

    useCase = module.get(DeleteCourseUseCase);
    courseGateway = module.get(CourseGateway);
    lessonGateway = module.get(LessonGateway);
    fileStorageGateway = module.get(FileStorageGateway);
  });

  // ──────────────────────────────────────────────────────────
  // 1. VALIDACIÓN: ¿El curso existe?
  // ──────────────────────────────────────────────────────────

  it('lanza NotFoundException si el curso no existe', async () => {
    courseGateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute(courseId)).rejects.toThrow(NotFoundException);

    expect(courseGateway.delete).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 2. Curso sin archivos — solo borra de la DB
  // ──────────────────────────────────────────────────────────

  it('borra el curso de la DB sin intentar limpiar archivos si no hay lecciones ni thumbnail', async () => {
    const course = {
      id: courseId,
      lessons: [],
      thumbnailUrl: null,
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);

    await useCase.execute(courseId);

    expect(courseGateway.delete).toHaveBeenCalledWith(courseId);
    expect(fileStorageGateway.deleteByUrl).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 3. Videos huérfanos — deleteByUrl se encarga
  // ──────────────────────────────────────────────────────────

  it('llama a deleteByUrl para cada video huérfano después de eliminar el curso', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: null,
      lessons: [
        { videoData: { videoUrl: '/static/videos/clase1.mp4' } },
        { videoData: { videoUrl: '/static/videos/clase2.mp4' } },
      ],
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    lessonGateway.isVideoUrlInUse.mockResolvedValue(false); // huérfanos

    await useCase.execute(courseId);

    expect(courseGateway.delete).toHaveBeenCalledWith(courseId);
    expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith('/static/videos/clase1.mp4');
    expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith('/static/videos/clase2.mp4');
  });

  // ──────────────────────────────────────────────────────────
  // 4. Video compartido — NO borra el archivo
  // ──────────────────────────────────────────────────────────

  it('NO llama a deleteByUrl si otra lección sigue usando el video', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: null,
      lessons: [
        { videoData: { videoUrl: '/static/videos/compartido.mp4' } },
      ],
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    lessonGateway.isVideoUrlInUse.mockResolvedValue(true); // en uso

    await useCase.execute(courseId);

    expect(fileStorageGateway.deleteByUrl).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 5. Thumbnail huérfana — deleteByUrl se encarga
  // ──────────────────────────────────────────────────────────

  it('llama a deleteByUrl para la thumbnail si ya no la usa ningún otro curso', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: '/static/thumbnails/portada.jpg',
      lessons: [],
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    courseGateway.isThumbnailUrlInUse.mockResolvedValue(false); // huérfana

    await useCase.execute(courseId);

    expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
      '/static/thumbnails/portada.jpg',
    );
  });

  // ──────────────────────────────────────────────────────────
  // 6. Thumbnail compartida — NO borra
  // ──────────────────────────────────────────────────────────

  it('NO llama a deleteByUrl si otro curso sigue usando la thumbnail', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: '/static/thumbnails/compartida.jpg',
      lessons: [],
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    courseGateway.isThumbnailUrlInUse.mockResolvedValue(true); // en uso

    await useCase.execute(courseId);

    expect(fileStorageGateway.deleteByUrl).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 7. URLs externas — deleteByUrl las ignora silenciosamente
  // ──────────────────────────────────────────────────────────

  /**
   * Después del refactor, el Use Case ya no filtra URLs externas —
   * recopila TODOS los videoUrls y deleteByUrl se encarga.
   * Si el video es de YouTube, deleteByUrl no hace nada.
   */
  it('recopila URLs externas pero deleteByUrl las ignora', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: null,
      lessons: [
        { videoData: { videoUrl: 'https://youtube.com/watch?v=abc123' } },
      ],
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    lessonGateway.isVideoUrlInUse.mockResolvedValue(false);

    await useCase.execute(courseId);

    // El Use Case llama a deleteByUrl — el gateway decide no borrar
    expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
      'https://youtube.com/watch?v=abc123',
    );
  });
});
