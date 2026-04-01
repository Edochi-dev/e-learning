import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UpdateCourseUseCase } from './update-course.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { Course } from '../entities/course.entity';

/**
 * Tests para UpdateCourseUseCase — actualización de metadatos de un curso.
 *
 * Patrón clásico: verificar que existe antes de actualizar.
 * Sin esta validación, el gateway podría hacer un UPDATE que no afecta
 * ninguna fila (el curso no existe) y retornar silenciosamente — el admin
 * pensaría que guardó sus cambios cuando en realidad no se guardó nada.
 */
describe('UpdateCourseUseCase', () => {
  let useCase: UpdateCourseUseCase;
  let courseGateway: jest.Mocked<CourseGateway>;

  const courseId = 'course-uuid-123';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        UpdateCourseUseCase,
        {
          provide: CourseGateway,
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(UpdateCourseUseCase);
    courseGateway = module.get(CourseGateway);
  });

  it('lanza NotFoundException si el curso no existe', async () => {
    courseGateway.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(courseId, { title: 'Nuevo título' } as any),
    ).rejects.toThrow(NotFoundException);

    // No debe intentar actualizar si no existe
    expect(courseGateway.update).not.toHaveBeenCalled();
  });

  it('actualiza el curso y retorna el resultado cuando existe', async () => {
    const existingCourse = { id: courseId, title: 'Viejo' } as Course;
    const updatedCourse = { id: courseId, title: 'Nuevo' } as Course;

    courseGateway.findOne.mockResolvedValue(existingCourse);
    courseGateway.update.mockResolvedValue(updatedCourse);

    const result = await useCase.execute(courseId, { title: 'Nuevo' } as any);

    expect(result).toBe(updatedCourse);
    expect(courseGateway.update).toHaveBeenCalledWith(
      courseId,
      { title: 'Nuevo' },
    );
  });
});
