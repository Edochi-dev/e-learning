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
 *   - Limpieza best-effort de videos y thumbnail
 *
 * La estrategia "DB primero, archivos después" significa que si el borrado
 * de la DB falla, los archivos quedan intactos (nada roto).
 * Si el borrado de archivos falla, solo tenemos basura en disco (recuperable).
 *
 * Escenarios a testear:
 *   1. Curso no existe → NotFoundException
 *   2. Curso sin lecciones ni thumbnail → solo borra DB
 *   3. Curso con videos locales huérfanos → borra archivos
 *   4. Video compartido por otro curso → NO borra el archivo
 *   5. Thumbnail huérfana → borra archivo
 *   6. Thumbnail compartida → NO borra
 *   7. Videos con URLs externas (YouTube) → NO intenta borrar
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
            isLocalFile: jest.fn(),
            deleteFile: jest.fn(),
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
    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 3. Videos locales huérfanos — borra los archivos
  // ──────────────────────────────────────────────────────────

  /**
   * Si el curso tiene lecciones con videos locales y esos videos NO son
   * usados por ninguna otra lección, deben borrarse del disco.
   *
   * Flujo:
   *   1. isLocalFile('/static/videos/clase1.mp4') → true
   *   2. isVideoUrlInUse('/static/videos/clase1.mp4') → false (huérfano)
   *   3. deleteFile('videos/clase1.mp4') ← quita el /static/ prefix
   */
  it('borra videos locales huérfanos después de eliminar el curso', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: null,
      lessons: [
        { videoData: { videoUrl: '/static/videos/clase1.mp4' } },
        { videoData: { videoUrl: '/static/videos/clase2.mp4' } },
      ],
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.isLocalFile.mockReturnValue(true);
    lessonGateway.isVideoUrlInUse.mockResolvedValue(false); // huérfanos

    await useCase.execute(courseId);

    // Primero borra de DB
    expect(courseGateway.delete).toHaveBeenCalledWith(courseId);

    // Luego borra cada video huérfano (sin el /static/ prefix)
    expect(fileStorageGateway.deleteFile).toHaveBeenCalledWith('videos/clase1.mp4');
    expect(fileStorageGateway.deleteFile).toHaveBeenCalledWith('videos/clase2.mp4');
  });

  // ──────────────────────────────────────────────────────────
  // 4. Video compartido — NO borra el archivo
  // ──────────────────────────────────────────────────────────

  /**
   * Si otra lección (de otro curso) usa el mismo video, NO debemos borrarlo.
   * isVideoUrlInUse devuelve true → el archivo se conserva.
   */
  it('NO borra un video si otra lección lo sigue usando', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: null,
      lessons: [
        { videoData: { videoUrl: '/static/videos/compartido.mp4' } },
      ],
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.isLocalFile.mockReturnValue(true);
    lessonGateway.isVideoUrlInUse.mockResolvedValue(true); // en uso

    await useCase.execute(courseId);

    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 5. Thumbnail huérfana — borra el archivo
  // ──────────────────────────────────────────────────────────

  it('borra la thumbnail si ya no la usa ningún otro curso', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: '/static/thumbnails/portada.jpg',
      lessons: [],
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.isLocalFile.mockReturnValue(true);
    courseGateway.isThumbnailUrlInUse.mockResolvedValue(false); // huérfana

    await useCase.execute(courseId);

    expect(fileStorageGateway.deleteFile).toHaveBeenCalledWith(
      'thumbnails/portada.jpg',
    );
  });

  // ──────────────────────────────────────────────────────────
  // 6. Thumbnail compartida — NO borra
  // ──────────────────────────────────────────────────────────

  it('NO borra la thumbnail si otro curso la sigue usando', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: '/static/thumbnails/compartida.jpg',
      lessons: [],
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.isLocalFile.mockReturnValue(true);
    courseGateway.isThumbnailUrlInUse.mockResolvedValue(true); // en uso

    await useCase.execute(courseId);

    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 7. URLs externas — ignora archivos que no son locales
  // ──────────────────────────────────────────────────────────

  /**
   * Si el video es un link de YouTube o un embed externo, isLocalFile
   * devuelve false y el Use Case no intenta borrarlo del filesystem.
   * Intentar borrar una URL externa causaría un error en el filesystem.
   */
  it('ignora videos con URLs externas (no intenta borrar del filesystem)', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: null,
      lessons: [
        { videoData: { videoUrl: 'https://youtube.com/watch?v=abc123' } },
      ],
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.isLocalFile.mockReturnValue(false); // URL externa

    await useCase.execute(courseId);

    // No debe preguntar si está en uso ni intentar borrar
    expect(lessonGateway.isVideoUrlInUse).not.toHaveBeenCalled();
    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();
  });
});
