import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UpdateCourseThumbnailUseCase } from './update-course-thumbnail.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { Course } from '../entities/course.entity';

/**
 * Tests para UpdateCourseThumbnailUseCase — reemplazo de miniatura.
 *
 * Flujo:
 *   1. Verificar que el curso existe
 *   2. Si había thumbnail local anterior → borrar del disco
 *   3. Guardar la nueva thumbnail → obtener URL
 *   4. Actualizar el curso con la nueva URL
 *
 * El "borrar antes de guardar" evita acumular archivos huérfanos en disco.
 * Cada vez que el admin cambia la portada, la vieja se limpia.
 */
describe('UpdateCourseThumbnailUseCase', () => {
  let useCase: UpdateCourseThumbnailUseCase;
  let courseGateway: jest.Mocked<CourseGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;

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
          },
        },
        {
          provide: FileStorageGateway,
          useValue: {
            isLocalFile: jest.fn(),
            deleteFile: jest.fn(),
            saveFile: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(UpdateCourseThumbnailUseCase);
    courseGateway = module.get(CourseGateway);
    fileStorageGateway = module.get(FileStorageGateway);
  });

  it('lanza NotFoundException si el curso no existe', async () => {
    courseGateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute(courseId, fakeFile)).rejects.toThrow(
      NotFoundException,
    );

    expect(fileStorageGateway.saveFile).not.toHaveBeenCalled();
  });

  it('borra la thumbnail local anterior antes de guardar la nueva', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: '/static/thumbnails/vieja.jpg',
    } as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.isLocalFile.mockReturnValue(true);
    fileStorageGateway.saveFile.mockResolvedValue('/static/thumbnails/nueva.jpg');
    courseGateway.update.mockResolvedValue({} as Course);

    await useCase.execute(courseId, fakeFile);

    // Borra la vieja primero
    expect(fileStorageGateway.deleteFile).toHaveBeenCalledWith('thumbnails/vieja.jpg');

    // Guarda la nueva
    expect(fileStorageGateway.saveFile).toHaveBeenCalledWith(fakeFile, 'thumbnails');

    // Actualiza con la nueva URL
    expect(courseGateway.update).toHaveBeenCalledWith(
      courseId,
      { thumbnailUrl: '/static/thumbnails/nueva.jpg' },
    );
  });

  it('NO intenta borrar si la thumbnail anterior era una URL externa', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: 'https://cdn.example.com/img.jpg',
    } as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.isLocalFile.mockReturnValue(false);
    fileStorageGateway.saveFile.mockResolvedValue('/static/thumbnails/nueva.jpg');
    courseGateway.update.mockResolvedValue({} as Course);

    await useCase.execute(courseId, fakeFile);

    // No borra la URL externa
    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();

    // Pero sí guarda la nueva y actualiza
    expect(fileStorageGateway.saveFile).toHaveBeenCalled();
    expect(courseGateway.update).toHaveBeenCalled();
  });

  it('funciona correctamente cuando el curso no tenía thumbnail previa', async () => {
    const course = { id: courseId, thumbnailUrl: null } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.saveFile.mockResolvedValue('/static/thumbnails/primera.jpg');
    courseGateway.update.mockResolvedValue({} as Course);

    await useCase.execute(courseId, fakeFile);

    expect(fileStorageGateway.deleteFile).not.toHaveBeenCalled();
    expect(fileStorageGateway.saveFile).toHaveBeenCalled();
  });
});
