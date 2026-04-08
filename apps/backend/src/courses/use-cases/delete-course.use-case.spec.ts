import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeleteCourseUseCase } from './delete-course.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { LessonGateway } from '../gateways/lesson.gateway';
import { OrphanFileCleaner } from '../../storage/services/orphan-file-cleaner.service';
import { Course } from '../entities/course.entity';

/**
 * Tests para DeleteCourseUseCase.
 *
 * Después del refactor, el use case ya no llama a deleteByUrl directamente:
 * delega a OrphanFileCleaner.deleteIfOrphan, pasándole un closure que sabe
 * preguntar al gateway correcto si el archivo aún está en uso.
 *
 * Por eso aquí mockeamos OrphanFileCleaner como una caja negra: nos basta con
 * verificar que el use case lo invoca con la URL correcta y un checker que,
 * al ejecutarse, llama al gateway esperado.
 */
describe('DeleteCourseUseCase', () => {
  let useCase: DeleteCourseUseCase;
  let courseGateway: jest.Mocked<CourseGateway>;
  let lessonGateway: jest.Mocked<LessonGateway>;
  let orphanFileCleaner: jest.Mocked<OrphanFileCleaner>;

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
          provide: OrphanFileCleaner,
          useValue: {
            deleteIfOrphan: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(DeleteCourseUseCase);
    courseGateway = module.get(CourseGateway);
    lessonGateway = module.get(LessonGateway);
    orphanFileCleaner = module.get(OrphanFileCleaner);
  });

  it('lanza NotFoundException si el curso no existe', async () => {
    courseGateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute(courseId)).rejects.toThrow(NotFoundException);

    expect(courseGateway.delete).not.toHaveBeenCalled();
    expect(orphanFileCleaner.deleteIfOrphan).not.toHaveBeenCalled();
  });

  it('borra el curso de la DB y NO invoca al cleaner si no hay lecciones ni thumbnail', async () => {
    const course = {
      id: courseId,
      lessons: [],
      thumbnailUrl: null,
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);

    await useCase.execute(courseId);

    expect(courseGateway.delete).toHaveBeenCalledWith(courseId);
    expect(orphanFileCleaner.deleteIfOrphan).not.toHaveBeenCalled();
  });

  it('invoca al cleaner para cada video de las lecciones después de borrar el curso', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: null,
      lessons: [
        { videoData: { videoUrl: '/static/videos/clase1.mp4' } },
        { videoData: { videoUrl: '/static/videos/clase2.mp4' } },
      ],
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);

    await useCase.execute(courseId);

    expect(courseGateway.delete).toHaveBeenCalledWith(courseId);
    expect(orphanFileCleaner.deleteIfOrphan).toHaveBeenCalledWith(
      '/static/videos/clase1.mp4',
      expect.any(Function),
    );
    expect(orphanFileCleaner.deleteIfOrphan).toHaveBeenCalledWith(
      '/static/videos/clase2.mp4',
      expect.any(Function),
    );
  });

  it('el checker pasado al cleaner consulta lessonGateway.isVideoUrlInUse', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: null,
      lessons: [{ videoData: { videoUrl: '/static/videos/clase1.mp4' } }],
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    lessonGateway.isVideoUrlInUse.mockResolvedValue(true);

    await useCase.execute(courseId);

    // Tomamos el checker que el use case le pasó al cleaner y lo ejecutamos
    // para verificar que delega al gateway correcto.
    const videoCall = orphanFileCleaner.deleteIfOrphan.mock.calls.find(
      ([url]) => url === '/static/videos/clase1.mp4',
    );
    expect(videoCall).toBeDefined();
    const checker = videoCall![1];
    const result = await checker();

    expect(lessonGateway.isVideoUrlInUse).toHaveBeenCalledWith(
      '/static/videos/clase1.mp4',
    );
    expect(result).toBe(true);
  });

  it('invoca al cleaner para la thumbnail con un checker que consulta courseGateway.isThumbnailUrlInUse', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: '/static/thumbnails/portada.jpg',
      lessons: [],
    } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    courseGateway.isThumbnailUrlInUse.mockResolvedValue(false);

    await useCase.execute(courseId);

    const thumbCall = orphanFileCleaner.deleteIfOrphan.mock.calls.find(
      ([url]) => url === '/static/thumbnails/portada.jpg',
    );
    expect(thumbCall).toBeDefined();
    const checker = thumbCall![1];
    const result = await checker();

    expect(courseGateway.isThumbnailUrlInUse).toHaveBeenCalledWith(
      '/static/thumbnails/portada.jpg',
    );
    expect(result).toBe(false);
  });
});
