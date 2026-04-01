import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FindOneCourseUseCase } from './find-one-course.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { Course } from '../entities/course.entity';

/**
 * Tests para FindOneCourseUseCase — búsqueda de un curso por ID.
 *
 * Patrón muy común en Clean Architecture: buscar una entidad por ID
 * y lanzar NotFoundException si no existe. Lo verás repetido en muchos
 * use cases porque es la primera línea de defensa contra IDs inválidos
 * (ya sea un typo, un UUID inventado, o un recurso eliminado).
 */
describe('FindOneCourseUseCase', () => {
  let useCase: FindOneCourseUseCase;
  let courseGateway: jest.Mocked<CourseGateway>;

  const courseId = 'course-uuid-123';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        FindOneCourseUseCase,
        {
          provide: CourseGateway,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(FindOneCourseUseCase);
    courseGateway = module.get(CourseGateway);
  });

  it('retorna el curso cuando existe', async () => {
    const fakeCourse = { id: courseId, title: 'Manicure Básico' } as Course;
    courseGateway.findOne.mockResolvedValue(fakeCourse);

    const result = await useCase.execute(courseId);

    expect(result).toBe(fakeCourse);
    expect(courseGateway.findOne).toHaveBeenCalledWith(courseId);
  });

  it('lanza NotFoundException si el curso no existe', async () => {
    courseGateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute(courseId)).rejects.toThrow(NotFoundException);
  });
});
