import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeleteCourseThumbnailUseCase } from './delete-course-thumbnail.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { Course } from '../entities/course.entity';

/**
 * Tests para DeleteCourseThumbnailUseCase — eliminación de miniatura.
 *
 * Flujo:
 *   1. Verificar que el curso existe
 *   2. Si tiene thumbnail local → borrar archivo del disco
 *   3. Actualizar curso con thumbnailUrl = undefined
 *
 * Después de esto, el curso queda sin miniatura (se mostrará un placeholder
 * en el frontend).
 */
describe('DeleteCourseThumbnailUseCase', () => {
  let useCase: DeleteCourseThumbnailUseCase;
  let courseGateway: jest.Mocked<CourseGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;

  const courseId = 'course-uuid-123';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        DeleteCourseThumbnailUseCase,
        {
          provide: CourseGateway,
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
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

    useCase = module.get(DeleteCourseThumbnailUseCase);
    courseGateway = module.get(CourseGateway);
    fileStorageGateway = module.get(FileStorageGateway);
  });

  it('lanza NotFoundException si el curso no existe', async () => {
    courseGateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute(courseId)).rejects.toThrow(NotFoundException);

    expect(courseGateway.update).not.toHaveBeenCalled();
  });

  it('borra el archivo local y setea thumbnailUrl a undefined', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: '/static/thumbnails/portada.jpg',
    } as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.isLocalFile.mockReturnValue(true);
    courseGateway.update.mockResolvedValue({} as Course);

    await useCase.execute(courseId);

    expect(fileStorageGateway.deleteFile).toHaveBeenCalledWith('thumbnails/portada.jpg');
    expect(courseGateway.update).toHaveBeenCalledWith(
      courseId,
      { thumbnailUrl: undefined },
    );
  });

  it('NO intenta borrar si la thumbnail era una URL externa', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: 'https://cdn.example.com/img.jpg',
    } as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.isLocalFile.mockReturnValue(false);
    courseGateway.update.mockResolvedValue({} as Course);

    await useCase.execute(courseId);

    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();
    // Pero sí actualiza thumbnailUrl a undefined
    expect(courseGateway.update).toHaveBeenCalledWith(
      courseId,
      { thumbnailUrl: undefined },
    );
  });

  it('no borra nada si el curso no tenía thumbnail', async () => {
    const course = { id: courseId, thumbnailUrl: null } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    courseGateway.update.mockResolvedValue({} as Course);

    await useCase.execute(courseId);

    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();
  });
});
