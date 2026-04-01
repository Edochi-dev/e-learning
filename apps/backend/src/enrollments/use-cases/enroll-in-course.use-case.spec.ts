import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EnrollInCourseUseCase } from './enroll-in-course.use-case';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { CourseGateway } from '../../courses/gateways/course.gateway';
import { Enrollment } from '../entities/enrollment.entity';

/**
 * Tests para EnrollInCourseUseCase — matriculación de un alumno en un curso.
 *
 * Tiene DOS validaciones antes de crear la matrícula:
 *   1. ¿El curso existe? → NotFoundException (evita FK rota en DB)
 *   2. ¿Ya está matriculado? → ConflictException (evita duplicados)
 *
 * El orden importa: primero verificamos que el curso exista, luego que no
 * haya matrícula duplicada. Si lo hiciéramos al revés, un courseId inventado
 * pasaría la primera validación (findByUserAndCourse retorna null → no hay
 * conflicto) y fallaría en la DB con un error críptico de FK.
 */
describe('EnrollInCourseUseCase', () => {
  let useCase: EnrollInCourseUseCase;
  let enrollmentGateway: jest.Mocked<EnrollmentGateway>;
  let courseGateway: jest.Mocked<CourseGateway>;

  const userId = 'user-uuid-123';
  const courseId = 'course-uuid-456';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        EnrollInCourseUseCase,
        {
          provide: EnrollmentGateway,
          useValue: {
            findByUserAndCourse: jest.fn(),
            enroll: jest.fn(),
          },
        },
        {
          provide: CourseGateway,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(EnrollInCourseUseCase);
    enrollmentGateway = module.get(EnrollmentGateway);
    courseGateway = module.get(CourseGateway);
  });

  // ──────────────────────────────────────────────────────────
  // 1. VALIDACIÓN: ¿El curso existe?
  // ──────────────────────────────────────────────────────────

  it('lanza NotFoundException si el curso no existe', async () => {
    courseGateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute(userId, courseId)).rejects.toThrow(
      NotFoundException,
    );

    expect(enrollmentGateway.enroll).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 2. VALIDACIÓN: ¿Ya está matriculado?
  // ──────────────────────────────────────────────────────────

  /**
   * Si el alumno ya tiene matrícula, no puede matricularse de nuevo.
   * Esto complementa el constraint UNIQUE en la DB, pero da un error
   * más amigable que un "duplicate key violation".
   */
  it('lanza ConflictException si ya está matriculado', async () => {
    courseGateway.findOne.mockResolvedValue({ id: courseId } as any);
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({
      id: 'existing-enrollment',
    } as Enrollment);

    await expect(useCase.execute(userId, courseId)).rejects.toThrow(
      ConflictException,
    );

    expect(enrollmentGateway.enroll).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 3. HAPPY PATH: matrícula exitosa
  // ──────────────────────────────────────────────────────────

  it('matricula al usuario cuando el curso existe y no hay matrícula previa', async () => {
    const newEnrollment = {
      id: 'enrollment-uuid',
      userId,
      courseId,
    } as Enrollment;

    courseGateway.findOne.mockResolvedValue({ id: courseId } as any);
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(null);
    enrollmentGateway.enroll.mockResolvedValue(newEnrollment);

    const result = await useCase.execute(userId, courseId);

    expect(result).toBe(newEnrollment);
    expect(enrollmentGateway.enroll).toHaveBeenCalledWith(userId, courseId);
  });
});
