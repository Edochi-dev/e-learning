import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeleteCourseThumbnailUseCase } from './delete-course-thumbnail.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { OrphanFileCleaner } from '../../storage/services/orphan-file-cleaner.service';
import { Course } from '../entities/course.entity';

/**
 * Tests para DeleteCourseThumbnailUseCase.
 *
 * Cubrimos:
 *   - Validación de existencia del curso.
 *   - Que se invoca al cleaner con la URL vieja y un checker que excluye
 *     al curso actual (bug fix: antes se borraba sin chequear referencias).
 *   - Que el campo thumbnailUrl se setea a undefined en el update final.
 */
describe('DeleteCourseThumbnailUseCase', () => {
  let useCase: DeleteCourseThumbnailUseCase;
  let courseGateway: jest.Mocked<CourseGateway>;
  let orphanFileCleaner: jest.Mocked<OrphanFileCleaner>;

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
            isThumbnailUrlReferenced: jest.fn(),
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

    useCase = module.get(DeleteCourseThumbnailUseCase);
    courseGateway = module.get(CourseGateway);
    orphanFileCleaner = module.get(OrphanFileCleaner);
  });

  it('lanza NotFoundException si el curso no existe', async () => {
    courseGateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute(courseId)).rejects.toThrow(NotFoundException);

    expect(courseGateway.update).not.toHaveBeenCalled();
    expect(orphanFileCleaner.deleteIfOrphan).not.toHaveBeenCalled();
  });

  it('invoca al cleaner con la thumbnail y un checker que excluye al curso actual', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: '/static/thumbnails/portada.jpg',
    } as Course;

    courseGateway.findOne.mockResolvedValue(course);
    courseGateway.update.mockResolvedValue({} as Course);
    courseGateway.isThumbnailUrlReferenced.mockResolvedValue(false);

    await useCase.execute(courseId);

    expect(orphanFileCleaner.deleteIfOrphan).toHaveBeenCalledWith(
      '/static/thumbnails/portada.jpg',
      expect.any(Function),
    );

    const checker = orphanFileCleaner.deleteIfOrphan.mock.calls[0][1];
    await checker();
    expect(courseGateway.isThumbnailUrlReferenced).toHaveBeenCalledWith(
      '/static/thumbnails/portada.jpg',
      courseId,
    );

    expect(courseGateway.update).toHaveBeenCalledWith(
      courseId,
      { thumbnailUrl: undefined },
    );
  });

  it('no invoca al cleaner si el curso no tenía thumbnail', async () => {
    const course = { id: courseId, thumbnailUrl: null } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    courseGateway.update.mockResolvedValue({} as Course);

    await useCase.execute(courseId);

    expect(orphanFileCleaner.deleteIfOrphan).not.toHaveBeenCalled();
  });
});
