import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SubmitQuizUseCase } from './submit-quiz.use-case';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { LessonProgressGateway } from '../gateways/lesson-progress.gateway';
import { QuizAttemptGateway } from '../gateways/quiz-attempt.gateway';
import { CourseGateway } from '../../courses/gateways/course.gateway';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';
import { Enrollment } from '../entities/enrollment.entity';
import { Lesson } from '../../courses/entities/lessons.entity';

/**
 * Tests para SubmitQuizUseCase — el Use Case más complejo del proyecto.
 *
 * Coordina 6 pasos:
 *   1. Ownership check (matrícula)
 *   2. Cargar lección con preguntas
 *   3. Validar que es un examen
 *   4. Cooldown de 30 minutos
 *   5. Evaluar respuestas
 *   6. Guardar intento + auto-completar si aprobó
 *
 * Este test usa jest.spyOn(Date, 'now') para controlar el tiempo
 * sin tener que esperar 30 minutos reales en un test.
 */
describe('SubmitQuizUseCase', () => {
  let useCase: SubmitQuizUseCase;
  let enrollmentGateway: jest.Mocked<EnrollmentGateway>;
  let lessonProgressGateway: jest.Mocked<LessonProgressGateway>;
  let quizAttemptGateway: jest.Mocked<QuizAttemptGateway>;
  let courseGateway: jest.Mocked<CourseGateway>;
  let lessonGateway: jest.Mocked<LessonGateway>;

  const userId = 'user-uuid-123';
  const lessonId = 'lesson-uuid-456';
  const courseId = 'course-uuid-789';

  // Lección tipo examen con 2 preguntas
  const examLesson = {
    id: lessonId,
    type: 'exam',
    examData: { passingScore: 2 }, // necesita 2 de 2 para aprobar
    questions: [
      {
        id: 'q1',
        text: '¿Cuántas capas de base?',
        relatedLessonId: 'lesson-video-1',
        options: [
          { id: 'o1a', text: '1', isCorrect: false },
          { id: 'o1b', text: '2', isCorrect: true }, // correcta
        ],
      },
      {
        id: 'q2',
        text: '¿Tiempo de secado?',
        relatedLessonId: 'lesson-video-2',
        options: [
          { id: 'o2a', text: '2 min', isCorrect: true }, // correcta
          { id: 'o2b', text: '10 min', isCorrect: false },
        ],
      },
    ],
  } as unknown as Lesson;

  // Respuestas: ambas correctas
  const correctAnswers = [
    { questionId: 'q1', selectedOptionId: 'o1b' },
    { questionId: 'q2', selectedOptionId: 'o2a' },
  ];

  // Respuestas: solo 1 correcta (q1 incorrecta, q2 correcta)
  const partialAnswers = [
    { questionId: 'q1', selectedOptionId: 'o1a' }, // incorrecta
    { questionId: 'q2', selectedOptionId: 'o2a' }, // correcta
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        SubmitQuizUseCase,
        {
          provide: EnrollmentGateway,
          useValue: { findByUserAndCourse: jest.fn() },
        },
        {
          provide: LessonProgressGateway,
          useValue: { markLessonComplete: jest.fn() },
        },
        {
          provide: QuizAttemptGateway,
          useValue: {
            getLastQuizAttempt: jest.fn(),
            saveQuizAttempt: jest.fn(),
          },
        },
        {
          provide: CourseGateway,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: LessonGateway,
          useValue: { findLessonWithQuestions: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(SubmitQuizUseCase);
    enrollmentGateway = module.get(EnrollmentGateway);
    lessonProgressGateway = module.get(LessonProgressGateway);
    quizAttemptGateway = module.get(QuizAttemptGateway);
    courseGateway = module.get(CourseGateway);
    lessonGateway = module.get(LessonGateway);
  });

  /**
   * Helper: configura los mocks para un flujo que pasa las validaciones.
   * Cada test solo necesita cambiar lo que le importa.
   */
  function setupValidFlow() {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({
      id: 'enrollment-1',
    } as Enrollment);
    lessonGateway.findLessonWithQuestions.mockResolvedValue(examLesson);
    quizAttemptGateway.getLastQuizAttempt.mockResolvedValue(null); // sin cooldown
    quizAttemptGateway.saveQuizAttempt.mockResolvedValue({} as any);
    courseGateway.findOne.mockResolvedValue({
      lessons: [
        { id: 'lesson-video-1', title: 'Preparación de uñas' },
        { id: 'lesson-video-2', title: 'Técnica de secado' },
      ],
    } as any);
  }

  // ──────────────────────────────────────────────────────────
  // 1. OWNERSHIP CHECK
  // ──────────────────────────────────────────────────────────

  it('lanza ForbiddenException si el usuario no está matriculado', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(null);

    await expect(
      useCase.execute(userId, lessonId, courseId, correctAnswers),
    ).rejects.toThrow(ForbiddenException);
  });

  // ──────────────────────────────────────────────────────────
  // 2. EXISTENCIA DE LA LECCIÓN
  // ──────────────────────────────────────────────────────────

  it('lanza NotFoundException si la lección no existe', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({
      id: 'e-1',
    } as Enrollment);
    lessonGateway.findLessonWithQuestions.mockResolvedValue(null);

    await expect(
      useCase.execute(userId, lessonId, courseId, correctAnswers),
    ).rejects.toThrow(NotFoundException);
  });

  // ──────────────────────────────────────────────────────────
  // 3. VALIDACIÓN DE TIPO
  // ──────────────────────────────────────────────────────────

  it('lanza BadRequestException si la lección no es un examen', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({
      id: 'e-1',
    } as Enrollment);
    lessonGateway.findLessonWithQuestions.mockResolvedValue({
      id: lessonId,
      type: 'class', // ← no es examen
    } as unknown as Lesson);

    await expect(
      useCase.execute(userId, lessonId, courseId, correctAnswers),
    ).rejects.toThrow(BadRequestException);
  });

  // ──────────────────────────────────────────────────────────
  // 4. COOLDOWN: 30 minutos entre intentos
  // ──────────────────────────────────────────────────────────

  /**
   * Si el último intento fue hace menos de 30 minutos, rechazamos con 429.
   * Esto obliga al alumno a repasar antes de reintentar.
   *
   * Usamos jest.spyOn(Date, 'now') para simular el tiempo:
   *   - Date.now() devuelve un valor fijo
   *   - lastAttempt.submittedAt fue hace 10 minutos
   *   - 10 min < 30 min → cooldown activo → 429
   */
  it('lanza 429 si el cooldown de 30 minutos no ha pasado', async () => {
    const now = 1700000000000; // timestamp fijo
    jest.spyOn(Date, 'now').mockReturnValue(now);

    enrollmentGateway.findByUserAndCourse.mockResolvedValue({
      id: 'e-1',
    } as Enrollment);
    lessonGateway.findLessonWithQuestions.mockResolvedValue(examLesson);

    // Último intento hace 10 minutos (600,000 ms)
    quizAttemptGateway.getLastQuizAttempt.mockResolvedValue({
      submittedAt: new Date(now - 10 * 60 * 1000), // hace 10 min
    } as any);

    await expect(
      useCase.execute(userId, lessonId, courseId, correctAnswers),
    ).rejects.toThrow(HttpException);

    try {
      await useCase.execute(userId, lessonId, courseId, correctAnswers);
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });

  /**
   * Si pasaron más de 30 minutos, el cooldown ya no aplica.
   */
  it('permite reintentar si ya pasaron 30+ minutos', async () => {
    const now = 1700000000000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    setupValidFlow();

    // Último intento hace 31 minutos — cooldown superado
    quizAttemptGateway.getLastQuizAttempt.mockResolvedValue({
      submittedAt: new Date(now - 31 * 60 * 1000),
    } as any);

    // No debe lanzar — el cooldown ya pasó
    await expect(
      useCase.execute(userId, lessonId, courseId, correctAnswers),
    ).resolves.toBeDefined();
  });

  // ──────────────────────────────────────────────────────────
  // 5. EVALUACIÓN: respuestas correctas e incorrectas
  // ──────────────────────────────────────────────────────────

  it('calcula score correctamente cuando todas las respuestas son correctas', async () => {
    setupValidFlow();

    const result = await useCase.execute(
      userId, lessonId, courseId, correctAnswers,
    );

    expect(result.score).toBe(2);
    expect(result.totalQuestions).toBe(2);
    expect(result.passed).toBe(true);
    expect(result.passingScore).toBe(2);
  });

  it('calcula score correctamente con respuestas parciales (no aprueba)', async () => {
    setupValidFlow();

    const result = await useCase.execute(
      userId, lessonId, courseId, partialAnswers,
    );

    expect(result.score).toBe(1);
    expect(result.passed).toBe(false);
  });

  /**
   * Si el alumno falló una pregunta, el detail debe incluir:
   *   - correct: false
   *   - relatedLessonId: el ID de la lección de video para repasar
   *   - relatedLessonTitle: el título resuelto desde el curso
   */
  it('incluye relatedLessonTitle en los detalles de respuestas incorrectas', async () => {
    setupValidFlow();

    const result = await useCase.execute(
      userId, lessonId, courseId, partialAnswers,
    );

    // q1 fue incorrecta → debe tener hint de repaso
    const q1Detail = result.details.find((d) => d.questionId === 'q1');
    expect(q1Detail?.correct).toBe(false);
    expect(q1Detail?.relatedLessonId).toBe('lesson-video-1');
    expect(q1Detail?.relatedLessonTitle).toBe('Preparación de uñas');

    // q2 fue correcta → no necesita hint
    const q2Detail = result.details.find((d) => d.questionId === 'q2');
    expect(q2Detail?.correct).toBe(true);
    expect(q2Detail?.relatedLessonId).toBeUndefined();
  });

  // ──────────────────────────────────────────────────────────
  // 6. AUTO-COMPLETAR: aprobó → lección marcada como completada
  // ──────────────────────────────────────────────────────────

  it('marca la lección como completada si el alumno aprobó', async () => {
    setupValidFlow();

    await useCase.execute(userId, lessonId, courseId, correctAnswers);

    expect(lessonProgressGateway.markLessonComplete).toHaveBeenCalledWith(
      userId,
      lessonId,
    );
  });

  it('NO marca la lección como completada si el alumno no aprobó', async () => {
    setupValidFlow();

    await useCase.execute(userId, lessonId, courseId, partialAnswers);

    expect(lessonProgressGateway.markLessonComplete).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // 7. GUARDAR INTENTO: siempre se guarda (aprobó o no)
  // ──────────────────────────────────────────────────────────

  it('siempre guarda el intento en el gateway (apruebe o no)', async () => {
    setupValidFlow();

    await useCase.execute(userId, lessonId, courseId, partialAnswers);

    expect(quizAttemptGateway.saveQuizAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        lessonId,
        score: 1,
        passed: false,
        answers: expect.arrayContaining([
          expect.objectContaining({ questionId: 'q1', correct: false }),
          expect.objectContaining({ questionId: 'q2', correct: true }),
        ]),
      }),
    );
  });

  // ──────────────────────────────────────────────────────────
  // 8. CASO BORDE: pregunta inválida se ignora
  // ──────────────────────────────────────────────────────────

  /**
   * Si el frontend envía un questionId que no existe en las preguntas
   * del examen, el Use Case lo ignora silenciosamente (continue).
   * Esto protege contra manipulación del request.
   */
  it('ignora respuestas con questionId que no existe en el examen', async () => {
    setupValidFlow();

    const answersWithInvalid = [
      ...correctAnswers,
      { questionId: 'INVENTADO', selectedOptionId: 'x' }, // no existe
    ];

    const result = await useCase.execute(
      userId, lessonId, courseId, answersWithInvalid,
    );

    // Solo 2 respuestas válidas, la inventada se ignoró
    expect(result.score).toBe(2);
    expect(result.details).toHaveLength(2);
  });
});
