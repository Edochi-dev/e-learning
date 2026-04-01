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
 *   2. Si había thumbnail anterior → deleteByUrl (el gateway decide si es local)
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
            deleteByUrl: jest.fn(),
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

  it('borra la thumbnail anterior via deleteByUrl antes de guardar la nueva', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: '/static/thumbnails/vieja.jpg',
    } as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.saveFile.mockResolvedValue('/static/thumbnails/nueva.jpg');
    courseGateway.update.mockResolvedValue({} as Course);

    await useCase.execute(courseId, fakeFile);

    // deleteByUrl recibe la URL completa — el gateway se encarga del resto
    expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
      '/static/thumbnails/vieja.jpg',
    );

    expect(fileStorageGateway.saveFile).toHaveBeenCalledWith(fakeFile, 'thumbnails');
    expect(courseGateway.update).toHaveBeenCalledWith(
      courseId,
      { thumbnailUrl: '/static/thumbnails/nueva.jpg' },
    );
  });

  /**
   * Si la thumbnail anterior era una URL externa (YouTube, CDN, etc.),
   * deleteByUrl la ignora silenciosamente. El Use Case ya no necesita
   * verificar isLocalFile — esa responsabilidad es del gateway.
   */
  it('delega a deleteByUrl incluso con URLs externas (el gateway decide)', async () => {
    const course = {
      id: courseId,
      thumbnailUrl: 'https://cdn.example.com/img.jpg',
    } as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.saveFile.mockResolvedValue('/static/thumbnails/nueva.jpg');
    courseGateway.update.mockResolvedValue({} as Course);

    await useCase.execute(courseId, fakeFile);

    // El Use Case llama a deleteByUrl siempre — el gateway decide si borrar o no
    expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
      'https://cdn.example.com/img.jpg',
    );
    expect(fileStorageGateway.saveFile).toHaveBeenCalled();
  });

  it('no llama a deleteByUrl cuando el curso no tenía thumbnail previa', async () => {
    const course = { id: courseId, thumbnailUrl: null } as unknown as Course;

    courseGateway.findOne.mockResolvedValue(course);
    fileStorageGateway.saveFile.mockResolvedValue('/static/thumbnails/primera.jpg');
    courseGateway.update.mockResolvedValue({} as Course);

    await useCase.execute(courseId, fakeFile);

    expect(fileStorageGateway.deleteByUrl).not.toHaveBeenCalled();
    expect(fileStorageGateway.saveFile).toHaveBeenCalled();
  });
});
