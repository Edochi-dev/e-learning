import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UpdateCourseThumbnailUseCase } from './update-course-thumbnail.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { OrphanFileCleaner } from '../../storage/services/orphan-file-cleaner.service';
import { Course } from '../entities/course.entity';

/**
 * Tests para UpdateCourseThumbnailUseCase.
 *
 * Cubrimos:
 *   - Validación de existencia del curso.
 *   - Que se invoca al cleaner con la URL vieja y un checker que excluye
 *     al curso actual (bug fix: antes se borraba sin chequear referencias).
 *   - Que la nueva miniatura se guarda y la URL se persiste.
 */
describe('UpdateCourseThumbnailUseCase', () => {
  let useCase: UpdateCourseThumbnailUseCase;
  let courseGateway: jest.Mocked<CourseGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;
  let orphanFileCleaner: jest.Mocked<OrphanFileCleaner>;

  const courseId = 'course-uuid-123';
  const fakeFile = {
    originalname: 'nueva-portada.jpg',
    buffer: Buffer.from('fake'),
  } as Express.Multer.File;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        UpdateCourseThumbnailUseCase,
        {
          provide: CourseGateway,
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            isThumbnailUrlReferenced: jest.fn(),
          },
        },
        {
          provide: FileStorageGateway,
          useValue: {
            saveFile: jest.fn(),
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

    useCase = module.get(UpdateCourseThumbnailUseCase);
    courseGateway = module.get(CourseGateway);
    fileStorageGateway = module.get(FileStorageGateway);
    orphanFileCleaner = module.get(OrphanFileCleaner);
  });

  it('lanza NotFoundException si el curso no existe', async () => {
    courseGateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute(courseId, fakeFile)).rejects.toThrow(
      NotFoundException,
    );

    expect(fileStorageGateway.saveFile).not.toHaveBeenCalled();
    expect(orphanFileCleaner.deleteIfOrphan).not.toHaveBeenCalled();
  });

  it('invoca al cleaner con la thumbnail vieja y un checker que excluye al curso actual', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: '/static/thumbnails/vieja.jpg',
    } as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.saveFile.mockResolvedValue('/static/thumbnails/nueva.jpg');
    courseGateway.update.mockResolvedValue({} as Course);
    courseGateway.isThumbnailUrlReferenced.mockResolvedValue(false);

    await useCase.execute(courseId, fakeFile);

    expect(orphanFileCleaner.deleteIfOrphan).toHaveBeenCalledWith(
      '/static/thumbnails/vieja.jpg',
      expect.any(Function),
    );

    // Ejecutar el checker para verificar que excluye al curso actual.
    const checker = orphanFileCleaner.deleteIfOrphan.mock.calls[0][1];
    await checker();
    expect(courseGateway.isThumbnailUrlReferenced).toHaveBeenCalledWith(
      '/static/thumbnails/vieja.jpg',
      courseId,
    );

    expect(fileStorageGateway.saveFile).toHaveBeenCalledWith(fakeFile, 'thumbnails');
    expect(courseGateway.update).toHaveBeenCalledWith(
      courseId,
      { thumbnailUrl: '/static/thumbnails/nueva.jpg' },
    );
  });

  it('NO invoca al cleaner cuando el curso no tenía thumbnail previa', async () => {
    const course = { id: courseId, thumbnailUrl: null } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.saveFile.mockResolvedValue('/static/thumbnails/primera.jpg');
    courseGateway.update.mockResolvedValue({} as Course);

    await useCase.execute(courseId, fakeFile);

    expect(orphanFileCleaner.deleteIfOrphan).not.toHaveBeenCalled();
    expect(fileStorageGateway.saveFile).toHaveBeenCalled();
  });
});
