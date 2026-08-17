import { Test } from '@nestjs/testing';
import { ListCourseStudentsUseCase } from './list-course-students.use-case';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { Enrollment } from '../entities/enrollment.entity';

describe('ListCourseStudentsUseCase', () => {
  let useCase: ListCourseStudentsUseCase;
  let enrollmentGateway: jest.Mocked<EnrollmentGateway>;

  const courseId = 'course-uuid';

  const buildEnrollment = (id: string, expiresAt: Date | null): Enrollment =>
    Object.assign(new Enrollment(), {
      id,
      courseId,
      enrolledAt: new Date('2026-01-01'),
      expiresAt,
      user: {
        id: `user-${id}`,
        fullName: `Alumna ${id}`,
        email: `${id}@test.local`,
      },
    });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ListCourseStudentsUseCase,
        {
          provide: EnrollmentGateway,
          useValue: { findByCourseWithUsers: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(ListCourseStudentsUseCase);
    enrollmentGateway = module.get(EnrollmentGateway);
  });

  it('devuelve el estado de acceso ya resuelto por el servidor', async () => {
    enrollmentGateway.findByCourseWithUsers.mockResolvedValue([
      buildEnrollment('permanente', null),
      buildEnrollment(
        'vigente',
        new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      ),
      buildEnrollment('vencida', new Date(Date.now() - 60_000)),
    ]);

    const result = await useCase.execute(courseId);

    expect(result).toHaveLength(3);

    expect(result[0].isActive).toBe(true);
    expect(result[0].daysRemaining).toBeNull();

    expect(result[1].isActive).toBe(true);
    expect(result[1].daysRemaining).toBe(5);

    expect(result[2].isActive).toBe(false);
    expect(result[2].daysRemaining).toBe(0);
  });

  it('expone solo los datos del alumno que el panel necesita', async () => {
    enrollmentGateway.findByCourseWithUsers.mockResolvedValue([
      buildEnrollment('a', null),
    ]);

    const [student] = await useCase.execute(courseId);

    // Nada de passwordHash ni role: la vista se arma con lo justo.
    expect(Object.keys(student.student).sort()).toEqual([
      'email',
      'fullName',
      'id',
    ]);
  });

  it('devuelve lista vacía si el curso no tiene alumnas', async () => {
    enrollmentGateway.findByCourseWithUsers.mockResolvedValue([]);

    expect(await useCase.execute(courseId)).toEqual([]);
  });
});
