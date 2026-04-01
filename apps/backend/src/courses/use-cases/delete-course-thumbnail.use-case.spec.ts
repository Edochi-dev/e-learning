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
 *   2. Si tiene thumbnail → deleteByUrl (el gateway decide si es local)
 *   3. Actualizar curso con thumbnailUrl = undefined
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
            deleteByUrl: jest.fn(),
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

  it('llama a deleteByUrl con la URL y setea thumbnailUrl a undefined', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: '/static/thumbnails/portada.jpg',
    } as Course;

    courseGateway.findOne.mockResolvedValue(course);
    courseGateway.update.mockResolvedValue({} as Course);

    await useCase.execute(courseId);

    expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
      '/static/thumbnails/portada.jpg',
    );
    expect(courseGateway.update).toHaveBeenCalledWith(
      courseId,
      { thumbnailUrl: undefined },
    );
  });

  it('delega a deleteByUrl incluso con URLs externas (el gateway decide)', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: 'https://cdn.example.com/img.jpg',
    } as Course;

    courseGateway.findOne.mockResolvedValue(course);
    courseGateway.update.mockResolvedValue({} as Course);

    await useCase.execute(courseId);

    expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
      'https://cdn.example.com/img.jpg',
    );
    expect(courseGateway.update).toHaveBeenCalledWith(
      courseId,
      { thumbnailUrl: undefined },
    );
  });

  it('no llama a deleteByUrl si el curso no tenía thumbnail', async () => {
    const course = { id: courseId, thumbnailUrl: null } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    courseGateway.update.mockResolvedValue({} as Course);

    await useCase.execute(courseId);

    expect(fileStorageGateway.deleteByUrl).not.toHaveBeenCalled();
  });
});
