import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddLessonUseCase } from './add-lesson.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { LessonGateway } from '../gateways/lesson.gateway';
import { Course } from '../entities/course.entity';
import { Lesson } from '../entities/lessons.entity';

/**
 * Tests para AddLessonUseCase — agregar una lección a un curso.
 *
 * La validación clave: el curso debe existir antes de agregar una lección.
 * Sin esto, el LessonGateway intentaría crear una lección con un courseId
 * que no existe → error de FK en la base de datos.
 *
 * El Use Case valida en la capa de negocio para dar un error amigable
 * (NotFoundException) en lugar de un error críptico de la base de datos.
 */
describe('AddLessonUseCase', () => {
  let useCase: AddLessonUseCase;
  let courseGateway: jest.Mocked<CourseGateway>;
  let lessonGateway: jest.Mocked<LessonGateway>;

  const courseId = 'course-uuid-123';
  const lessonDto = {
    title: 'Lección 1: Preparación',
    description: 'Cómo preparar las uñas',
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        AddLessonUseCase,
        {
          provide: CourseGateway,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: LessonGateway,
          useValue: { addLesson: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(AddLessonUseCase);
    courseGateway = module.get(CourseGateway);
    lessonGateway = module.get(LessonGateway);
  });

  it('lanza NotFoundException si el curso no existe', async () => {
    courseGateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute(courseId, lessonDto)).rejects.toThrow(
      NotFoundException,
    );

    expect(lessonGateway.addLesson).not.toHaveBeenCalled();
  });

  it('agrega la lección al curso cuando existe', async () => {
    const fakeCourse = { id: courseId } as Course;
    const newLesson = { id: 'lesson-1', title: 'Lección 1' } as Lesson;

    courseGateway.findOne.mockResolvedValue(fakeCourse);
    lessonGateway.addLesson.mockResolvedValue(newLesson);

    const result = await useCase.execute(courseId, lessonDto);

    expect(result).toBe(newLesson);
    expect(lessonGateway.addLesson).toHaveBeenCalledWith(courseId, lessonDto);
  });
});
