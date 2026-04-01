import { Test } from '@nestjs/testing';
import { CreateCourseUseCase } from './create-course.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { Course } from '../entities/course.entity';

/**
 * Tests para CreateCourseUseCase — creación de cursos con miniatura opcional.
 *
 * Este Use Case tiene DOS caminos posibles:
 *   a) Sin thumbnail → crea el curso con thumbnailUrl undefined
 *   b) Con thumbnail → guarda el archivo primero, luego crea el curso con la URL
 *
 * Punto de seguridad importante:
 * El thumbnailUrl NUNCA viene del DTO (del cliente). Si el cliente pudiera
 * enviar una URL arbitraria, podría apuntar a un archivo malicioso.
 * Solo lo asignamos DESPUÉS de guardar el archivo en nuestro propio storage.
 */
describe('CreateCourseUseCase', () => {
  let useCase: CreateCourseUseCase;
  let courseGateway: jest.Mocked<CourseGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;

  const createDto = {
    title: 'Manicure Básico',
    price: 49.99,
    description: 'Aprende las bases',
  };

  // Objeto falso que simula un archivo subido por Multer.
  // En tests no necesitamos un archivo real — solo la forma del objeto.
  const fakeFile = {
    originalname: 'foto.jpg',
    buffer: Buffer.from('fake-image'),
    mimetype: 'image/jpeg',
  } as Express.Multer.File;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        CreateCourseUseCase,
        {
          provide: CourseGateway,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: FileStorageGateway,
          useValue: {
            saveFile: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(CreateCourseUseCase);
    courseGateway = module.get(CourseGateway);
    fileStorageGateway = module.get(FileStorageGateway);
  });

  // ──────────────────────────────────────────────────────────
  // 1. Creación SIN thumbnail
  // ──────────────────────────────────────────────────────────

  it('crea el curso sin thumbnail cuando no se sube imagen', async () => {
    const savedCourse = { id: 'new-id', ...createDto } as unknown as Course;
    courseGateway.create.mockResolvedValue(savedCourse);

    const result = await useCase.execute(createDto);

    expect(result).toBe(savedCourse);

    // Verifica que thumbnailUrl es undefined (no se envió imagen)
    const courseData = courseGateway.create.mock.calls[0][0];
    expect(courseData.thumbnailUrl).toBeUndefined();

    // saveFile NUNCA debe llamarse si no hay archivo
    expect(fileStorageGateway.saveFile).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 2. Creación CON thumbnail
  // ──────────────────────────────────────────────────────────

  /**
   * Cuando el admin sube una imagen:
   * 1. Se guarda en disco via FileStorageGateway → obtiene URL pública
   * 2. Esa URL se incluye al crear el curso
   *
   * El orden importa: primero guardar archivo, luego crear en DB.
   * Si creáramos en DB primero con la URL y el archivo falla,
   * tendríamos un curso apuntando a una imagen que no existe.
   */
  it('guarda la thumbnail en storage y crea el curso con su URL', async () => {
    fileStorageGateway.saveFile.mockResolvedValue('/static/thumbnails/uuid.jpg');
    courseGateway.create.mockResolvedValue({} as Course);

    await useCase.execute(createDto, fakeFile);

    // Verifica que el archivo se guarda en la carpeta 'thumbnails'
    expect(fileStorageGateway.saveFile).toHaveBeenCalledWith(
      fakeFile,
      'thumbnails',
    );

    // Verifica que el curso se crea con la URL de la thumbnail guardada
    const courseData = courseGateway.create.mock.calls[0][0];
    expect(courseData.thumbnailUrl).toBe('/static/thumbnails/uuid.jpg');
  });

  // ──────────────────────────────────────────────────────────
  // 3. Los datos del DTO se pasan correctamente
  // ──────────────────────────────────────────────────────────

  it('pasa title, price y description del DTO al gateway', async () => {
    courseGateway.create.mockResolvedValue({} as Course);

    await useCase.execute(createDto);

    const courseData = courseGateway.create.mock.calls[0][0];
    expect(courseData.title).toBe('Manicure Básico');
    expect(courseData.price).toBe(49.99);
    expect(courseData.description).toBe('Aprende las bases');
  });
});
