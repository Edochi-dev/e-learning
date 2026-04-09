import { Test } from '@nestjs/testing';
import { FindAllCoursesUseCase } from './find-all-courses.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { Course } from '../entities/course.entity';

/**
 * Tests para FindAllCoursesUseCase — listado paginado de cursos.
 *
 * Este Use Case es un pass-through con paginación: recibe page y limit,
 * delega al gateway, y retorna el resultado tal cual.
 *
 * A diferencia de FindAllUsersUseCase, este retorna un PaginatedResult
 * (data + total + page + limit) en lugar de un array simple.
 */
describe('FindAllCoursesUseCase', () => {
  let useCase: FindAllCoursesUseCase;
  let courseGateway: jest.Mocked<CourseGateway>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        FindAllCoursesUseCase,
        {
          provide: CourseGateway,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(FindAllCoursesUseCase);
    courseGateway = module.get(CourseGateway);
  });

  it('delega la paginación al gateway y retorna el resultado', async () => {
    const paginatedResult = {
      data: [{ id: '1', title: 'Manicure Básico' }] as Course[],
      total: 1,
      page: 1,
      limit: 10,
    };

    courseGateway.findAll.mockResolvedValue(paginatedResult);

    const result = await useCase.execute(1, 10);

    expect(result).toBe(paginatedResult);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(courseGateway.findAll).toHaveBeenCalledWith(1, 10);
  });

  it('retorna resultado vacío si no hay cursos', async () => {
    const emptyResult = {
      data: [] as Course[],
      total: 0,
      page: 1,
      limit: 10,
    };

    courseGateway.findAll.mockResolvedValue(emptyResult);

    const result = await useCase.execute(1, 10);

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});
