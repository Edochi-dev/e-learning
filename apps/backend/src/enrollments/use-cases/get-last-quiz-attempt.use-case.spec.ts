import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GetLastQuizAttemptUseCase } from './get-last-quiz-attempt.use-case';
import { QuizAttemptGateway } from '../gateways/quiz-attempt.gateway';
import { CourseGateway } from '../../courses/gateways/course.gateway';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';

/**
 * Tests para GetLastQuizAttemptUseCase — reconstruye el último intento de un
 * alumno en un examen, con su cooldown, para que el QuizPlayer sepa qué
 * pantalla mostrar al montar.
 *
 * Cubrimos las cuatro decisiones importantes del Use Case:
 *   1. Guardas de acceso (matrícula, lección existe, es examen).
 *   2. Sin intentos previos → { result: null, cooldownRemainingMs: 0 }.
 *   3. Intento APROBADO → resultado reconstruido, sin cooldown.
 *   4. Intento REPROBADO dentro del cooldown → cooldownRemainingMs > 0 y
 *      enriquecimiento del hint "Repasa: [lección]".
 *
 * COOLDOWN Y TIEMPO
 * El Use Case usa `Date.now()`. Para que el test sea determinista (no dependa
 * de la hora real de la máquina) congelamos el reloj con jest.spyOn(Date,'now').
 * Así podemos colocar `submittedAt` a una distancia exacta de "ahora".
 */
describe('GetLastQuizAttemptUseCase', () => {
  let useCase: GetLastQuizAttemptUseCase;
  let quizAttemptGateway: jest.Mocked<QuizAttemptGateway>;
  let courseGateway: jest.Mocked<CourseGateway>;
  let lessonGateway: jest.Mocked<LessonGateway>;

  const USER_ID = 'user-1';
  const LESSON_ID = 'lesson-1';
  const COURSE_ID = 'course-1';
  const COOLDOWN_MS = 30 * 60 * 1000; // 30 min — debe coincidir con el Use Case.
  const NOW = 1_700_000_000_000; // instante fijo de referencia.

  // Lección tipo examen con dos preguntas; la 2ª tiene lección relacionada.
  const examLesson = {
    id: LESSON_ID,
    type: 'exam',
    examData: { passingScore: 2 },
    questions: [
      { id: 'q1', relatedLessonId: undefined },
      { id: 'q2', relatedLessonId: 'lesson-remedial' },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);

    const module = await Test.createTestingModule({
      providers: [
        GetLastQuizAttemptUseCase,
        {
          provide: QuizAttemptGateway,
          useValue: { getLastQuizAttempt: jest.fn() },
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

    useCase = module.get(GetLastQuizAttemptUseCase);
    quizAttemptGateway = module.get(QuizAttemptGateway);
    courseGateway = module.get(CourseGateway);
    lessonGateway = module.get(LessonGateway);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────
  // 1. Guardas de acceso
  // ──────────────────────────────────────────────────────────

  it('lanza NotFoundException si la lección no existe', async () => {
    lessonGateway.findLessonWithQuestions.mockResolvedValue(null as any);

    await expect(
      useCase.execute(USER_ID, LESSON_ID, COURSE_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lanza BadRequestException si la lección no es un examen', async () => {
    lessonGateway.findLessonWithQuestions.mockResolvedValue({
      ...examLesson,
      type: 'video',
    } as any);

    await expect(
      useCase.execute(USER_ID, LESSON_ID, COURSE_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // ──────────────────────────────────────────────────────────
  // 2. Sin intentos previos
  // ──────────────────────────────────────────────────────────

  it('devuelve result:null y cooldown 0 cuando no hay intentos previos', async () => {
    lessonGateway.findLessonWithQuestions.mockResolvedValue(examLesson as any);
    quizAttemptGateway.getLastQuizAttempt.mockResolvedValue(null as any);

    const res = await useCase.execute(USER_ID, LESSON_ID, COURSE_ID);

    // Importante: NO devolvemos null crudo (rompería response.json() en el
    // frontend), sino un objeto serializable.
    expect(res).toEqual({ result: null, cooldownRemainingMs: 0 });
  });

  // ──────────────────────────────────────────────────────────
  // 3. Intento APROBADO → sin cooldown
  // ──────────────────────────────────────────────────────────

  it('reconstruye un intento aprobado sin cooldown', async () => {
    lessonGateway.findLessonWithQuestions.mockResolvedValue(examLesson as any);
    quizAttemptGateway.getLastQuizAttempt.mockResolvedValue({
      passed: true,
      score: 2,
      submittedAt: new Date(NOW - 1000), // hace 1s; irrelevante si aprobó
      answers: [
        { questionId: 'q1', selectedOptionId: 'a', correct: true },
        { questionId: 'q2', selectedOptionId: 'b', correct: true },
      ],
    } as any);
    courseGateway.findOne.mockResolvedValue({ lessons: [] } as any);

    const res = await useCase.execute(USER_ID, LESSON_ID, COURSE_ID);

    expect(res.cooldownRemainingMs).toBe(0);
    expect(res.result).toMatchObject({
      passed: true,
      score: 2,
      totalQuestions: 2,
      passingScore: 2,
    });
    expect(res.result?.details).toHaveLength(2);
  });

  // ──────────────────────────────────────────────────────────
  // 4. Intento REPROBADO dentro del cooldown + enriquecimiento
  // ──────────────────────────────────────────────────────────

  it('calcula el cooldown restante y enriquece el hint de repaso en un intento reprobado', async () => {
    // submittedAt hace 10 min → quedan 20 min de cooldown.
    const elapsed = 10 * 60 * 1000;

    lessonGateway.findLessonWithQuestions.mockResolvedValue(examLesson as any);
    quizAttemptGateway.getLastQuizAttempt.mockResolvedValue({
      passed: false,
      score: 1,
      submittedAt: new Date(NOW - elapsed),
      answers: [
        { questionId: 'q1', selectedOptionId: 'a', correct: true },
        { questionId: 'q2', selectedOptionId: 'x', correct: false }, // falló
      ],
    } as any);
    // El curso conoce el título de la lección de repaso relacionada.
    courseGateway.findOne.mockResolvedValue({
      lessons: [{ id: 'lesson-remedial', title: 'Fundamentos de esmaltado' }],
    } as any);

    const res = await useCase.execute(USER_ID, LESSON_ID, COURSE_ID);

    // 30 min - 10 min transcurridos = 20 min restantes.
    expect(res.cooldownRemainingMs).toBe(COOLDOWN_MS - elapsed);

    const q1 = res.result?.details.find((d) => d.questionId === 'q1');
    const q2 = res.result?.details.find((d) => d.questionId === 'q2');
    // La correcta no arrastra hint de repaso.
    expect(q1?.relatedLessonId).toBeUndefined();
    // La incorrecta con lección relacionada sí, con su título enriquecido.
    expect(q2?.relatedLessonId).toBe('lesson-remedial');
    expect(q2?.relatedLessonTitle).toBe('Fundamentos de esmaltado');
  });

  it('deja el cooldown en 0 si el intento reprobado ya venció el cooldown', async () => {
    // submittedAt hace 45 min → el cooldown de 30 min ya pasó.
    lessonGateway.findLessonWithQuestions.mockResolvedValue(examLesson as any);
    quizAttemptGateway.getLastQuizAttempt.mockResolvedValue({
      passed: false,
      score: 0,
      submittedAt: new Date(NOW - 45 * 60 * 1000),
      answers: [],
    } as any);
    courseGateway.findOne.mockResolvedValue({ lessons: [] } as any);

    const res = await useCase.execute(USER_ID, LESSON_ID, COURSE_ID);

    expect(res.cooldownRemainingMs).toBe(0);
  });
});
