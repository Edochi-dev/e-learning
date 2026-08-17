import { Test } from '@nestjs/testing';
import { GetMyEnrollmentsUseCase } from './get-my-enrollments.use-case';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { LessonProgressGateway } from '../../progress/gateways/lesson-progress.gateway';
import { Enrollment } from '../entities/enrollment.entity';

/**
 * Tests para GetMyEnrollmentsUseCase — listado de cursos del alumno con progreso.
 *
 * Este Use Case combina datos de 2 gateways y calcula el progreso en memoria:
 *   1. EnrollmentGateway.findByUserWithCourses → matrículas con cursos y lecciones
 *   2. LessonProgressGateway.getCompletedLessonIdsByCourse → progreso agrupado
 *
 * El cálculo del progreso es una REGLA DE NEGOCIO:
 *   progressPercent = Math.round((completedLessons / totalLessons) * 100)
 *
 * Casos a testear:
 *   - Happy path con progreso parcial
 *   - Curso sin lecciones (evitar división por cero)
 *   - Curso sin progreso (0%)
 *   - Usuario sin matrículas (array vacío)
 */
describe('GetMyEnrollmentsUseCase', () => {
  let useCase: GetMyEnrollmentsUseCase;
  let enrollmentGateway: jest.Mocked<EnrollmentGateway>;
  let lessonProgressGateway: jest.Mocked<LessonProgressGateway>;

  const userId = 'user-uuid-123';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        GetMyEnrollmentsUseCase,
        {
          provide: EnrollmentGateway,
          useValue: {
            findByUserWithCourses: jest.fn(),
          },
        },
        {
          provide: LessonProgressGateway,
          useValue: {
            getCompletedLessonIdsByCourse: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(GetMyEnrollmentsUseCase);
    enrollmentGateway = module.get(EnrollmentGateway);
    lessonProgressGateway = module.get(LessonProgressGateway);
  });

  /**
   * Los fixtures tienen que ser instancias reales: el use case llama a
   * enrollment.isActive() y enrollment.daysRemaining(), que un objeto literal
   * no tiene.
   */
  const toEnrollments = (rows: Record<string, unknown>[]): Enrollment[] =>
    rows.map((row) => Object.assign(new Enrollment(), row));

  // ──────────────────────────────────────────────────────────
  // 1. HAPPY PATH: progreso parcial
  // ──────────────────────────────────────────────────────────

  /**
   * Alumno matriculado en un curso con 4 lecciones, 2 completadas.
   * Progreso esperado: Math.round((2 / 4) * 100) = 50%
   */
  it('calcula el progressPercent correctamente con progreso parcial', async () => {
    const enrollments = toEnrollments([
      {
        id: 'enrollment-1',
        courseId: 'course-A',
        enrolledAt: new Date('2025-01-01'),
        course: {
          id: 'course-A',
          title: 'Manicure Básico',
          description: 'Curso de uñas',
          thumbnailUrl: '/static/thumbnails/img.jpg',
          lessons: [{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }, { id: 'l4' }],
        },
      },
    ]);

    enrollmentGateway.findByUserWithCourses.mockResolvedValue(enrollments);
    lessonProgressGateway.getCompletedLessonIdsByCourse.mockResolvedValue({
      'course-A': ['l1', 'l3'], // 2 de 4 completadas
    });

    const result = await useCase.execute(userId);

    expect(result).toHaveLength(1);
    expect(result[0].completedLessons).toBe(2);
    expect(result[0].progressPercent).toBe(50);
    expect(result[0].course.totalLessons).toBe(4);
    expect(result[0].enrollmentId).toBe('enrollment-1');
  });

  // ──────────────────────────────────────────────────────────
  // 2. CASO BORDE: curso sin lecciones (evitar división por cero)
  // ──────────────────────────────────────────────────────────

  /**
   * Un curso recién creado puede no tener lecciones aún.
   * totalLessons = 0 → sin protección, haríamos (0 / 0) * 100 = NaN.
   * El Use Case devuelve 0% en este caso.
   */
  it('retorna 0% si el curso no tiene lecciones (evita NaN)', async () => {
    const enrollments = toEnrollments([
      {
        id: 'enrollment-2',
        courseId: 'course-B',
        enrolledAt: new Date(),
        course: {
          id: 'course-B',
          title: 'Curso Vacío',
          description: 'Sin lecciones',
          thumbnailUrl: null,
          lessons: [], // Sin lecciones
        },
      },
    ]);

    enrollmentGateway.findByUserWithCourses.mockResolvedValue(enrollments);
    lessonProgressGateway.getCompletedLessonIdsByCourse.mockResolvedValue({});

    const result = await useCase.execute(userId);

    expect(result[0].progressPercent).toBe(0);
    expect(result[0].completedLessons).toBe(0);
    expect(result[0].course.totalLessons).toBe(0);
  });

  // ──────────────────────────────────────────────────────────
  // 3. Usuario sin matrículas
  // ──────────────────────────────────────────────────────────

  it('retorna array vacío si el usuario no tiene matrículas', async () => {
    enrollmentGateway.findByUserWithCourses.mockResolvedValue([]);
    lessonProgressGateway.getCompletedLessonIdsByCourse.mockResolvedValue({});

    const result = await useCase.execute(userId);

    expect(result).toEqual([]);
  });

  // ──────────────────────────────────────────────────────────
  // 4. thumbnailUrl null se preserva (no undefined)
  // ──────────────────────────────────────────────────────────

  it('mapea thumbnailUrl a null cuando el curso no tiene miniatura', async () => {
    const enrollments = toEnrollments([
      {
        id: 'e-1',
        courseId: 'c-1',
        enrolledAt: new Date(),
        course: {
          id: 'c-1',
          title: 'Test',
          description: 'Desc',
          thumbnailUrl: undefined, // sin thumbnail
          lessons: [{ id: 'l1' }],
        },
      },
    ]);

    enrollmentGateway.findByUserWithCourses.mockResolvedValue(enrollments);
    lessonProgressGateway.getCompletedLessonIdsByCourse.mockResolvedValue({});

    const result = await useCase.execute(userId);

    expect(result[0].course.thumbnailUrl).toBeNull();
  });

  // ──────────────────────────────────────────────────────────
  // 5. Estado del acceso temporal
  // ──────────────────────────────────────────────────────────

  /**
   * La lista sigue mostrando los cursos vencidos: vencer no es darse de baja.
   * La alumna conserva progreso y certificado, y necesita verlos para renovar.
   */
  it('marca el estado de acceso de cada matrícula', async () => {
    const course = {
      id: 'c-1',
      title: 'Test',
      description: 'Desc',
      thumbnailUrl: null,
      lessons: [{ id: 'l1' }],
    };

    const enrollments = toEnrollments([
      {
        id: 'permanente',
        courseId: 'c-1',
        enrolledAt: new Date(),
        expiresAt: null,
        course,
      },
      {
        id: 'vigente',
        courseId: 'c-2',
        enrolledAt: new Date(),
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        course: { ...course, id: 'c-2' },
      },
      {
        id: 'vencida',
        courseId: 'c-3',
        enrolledAt: new Date(),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        course: { ...course, id: 'c-3' },
      },
    ]);

    enrollmentGateway.findByUserWithCourses.mockResolvedValue(enrollments);
    lessonProgressGateway.getCompletedLessonIdsByCourse.mockResolvedValue({});

    const result = await useCase.execute(userId);

    expect(result).toHaveLength(3);

    expect(result[0].isActive).toBe(true);
    expect(result[0].daysRemaining).toBeNull();

    expect(result[1].isActive).toBe(true);
    expect(result[1].daysRemaining).toBe(3);

    expect(result[2].isActive).toBe(false);
    expect(result[2].daysRemaining).toBe(0);
  });
});
