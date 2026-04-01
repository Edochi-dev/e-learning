import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GetQuizQuestionsUseCase } from './get-quiz-questions.use-case';
import { LessonGateway } from '../gateways/lesson.gateway';
import { Lesson } from '../entities/lessons.entity';

/**
 * Tests para GetQuizQuestionsUseCase — obtención segura de preguntas de quiz.
 *
 * RESPONSABILIDAD DE SEGURIDAD CRÍTICA:
 *   Este Use Case OMITE el campo `isCorrect` de las opciones.
 *
 *   Sin esta protección, un alumno podría abrir el Network tab del navegador,
 *   ver el JSON de respuesta, y saber cuál opción es correcta ANTES de responder.
 *
 *   El mapeo crea objetos NUEVOS que solo incluyen: id, text, order,
 *   relatedLessonId (para preguntas) y id, text (para opciones).
 *   El `isCorrect` se queda en la BD y solo lo lee SubmitQuizUseCase
 *   cuando el alumno envía sus respuestas.
 *
 * También valida que:
 *   - La lección existe
 *   - La lección es de tipo 'exam' (no 'class')
 */
describe('GetQuizQuestionsUseCase', () => {
  let useCase: GetQuizQuestionsUseCase;
  let lessonGateway: jest.Mocked<LessonGateway>;

  const lessonId = 'lesson-uuid-123';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        GetQuizQuestionsUseCase,
        {
          provide: LessonGateway,
          useValue: {
            findLessonWithQuestions: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(GetQuizQuestionsUseCase);
    lessonGateway = module.get(LessonGateway);
  });

  // ──────────────────────────────────────────────────────────
  // 1. VALIDACIONES
  // ──────────────────────────────────────────────────────────

  it('lanza NotFoundException si la lección no existe', async () => {
    lessonGateway.findLessonWithQuestions.mockResolvedValue(null);

    await expect(useCase.execute(lessonId)).rejects.toThrow(NotFoundException);
  });

  it('lanza NotFoundException si la lección no es un examen', async () => {
    const videoLesson = {
      id: lessonId,
      type: 'class', // ← No es un examen
      questions: [],
    } as unknown as Lesson;

    lessonGateway.findLessonWithQuestions.mockResolvedValue(videoLesson);

    await expect(useCase.execute(lessonId)).rejects.toThrow(NotFoundException);
  });

  // ──────────────────────────────────────────────────────────
  // 2. SEGURIDAD: isCorrect NUNCA aparece en la respuesta
  // ──────────────────────────────────────────────────────────

  /**
   * Este es EL test más importante de este Use Case.
   * Si `isCorrect` aparece en la respuesta, el alumno puede hacer trampa.
   *
   * Verificamos que:
   *   a) Las opciones tienen id y text
   *   b) Las opciones NO tienen isCorrect
   *   c) Las preguntas tienen id, text, order, relatedLessonId
   */
  it('OMITE isCorrect de las opciones para que el alumno no vea las respuestas', async () => {
    const examLesson = {
      id: lessonId,
      type: 'exam',
      questions: [
        {
          id: 'q1',
          text: '¿Cuántas capas de esmalte se aplican?',
          order: 0,
          relatedLessonId: 'lesson-video-1',
          options: [
            { id: 'o1', text: '1 capa', isCorrect: false },
            { id: 'o2', text: '2 capas', isCorrect: true },  // ← ESTA es la correcta
            { id: 'o3', text: '3 capas', isCorrect: false },
          ],
        },
      ],
    } as unknown as Lesson;

    lessonGateway.findLessonWithQuestions.mockResolvedValue(examLesson);

    const result = await useCase.execute(lessonId);

    // Verificar estructura de la pregunta
    expect(result[0].id).toBe('q1');
    expect(result[0].text).toBe('¿Cuántas capas de esmalte se aplican?');
    expect(result[0].order).toBe(0);
    expect(result[0].relatedLessonId).toBe('lesson-video-1');

    // Verificar estructura de las opciones — deben tener id y text
    expect(result[0].options[0].id).toBe('o1');
    expect(result[0].options[0].text).toBe('1 capa');

    // VERIFICACIÓN CRÍTICA: isCorrect NO debe existir en ninguna opción
    for (const option of result[0].options) {
      expect(option).not.toHaveProperty('isCorrect');
    }
  });

  // ──────────────────────────────────────────────────────────
  // 3. CASO BORDE: examen sin preguntas
  // ──────────────────────────────────────────────────────────

  it('retorna array vacío si el examen no tiene preguntas', async () => {
    const emptyExam = {
      id: lessonId,
      type: 'exam',
      questions: [],
    } as unknown as Lesson;

    lessonGateway.findLessonWithQuestions.mockResolvedValue(emptyExam);

    const result = await useCase.execute(lessonId);

    expect(result).toEqual([]);
  });
});
