import { QuizAttempt } from '../entities/quiz-attempt.entity';

/**
 * CreateQuizAttemptData — Tipo intermedio para guardar un intento de quiz.
 *
 * ¿Por qué no usar Partial<QuizAttempt> directamente?
 *
 * Porque QuizAttempt.answers es QuizAttemptAnswer[] (entidades con relaciones,
 * PK, FK a QuizAttempt, etc.). El Use Case no debería construir entidades —
 * solo pasa los datos planos. El repositorio es quien crea las entidades.
 */
export interface CreateQuizAttemptData {
  userId: string;
  lessonId: string;
  score: number;
  passed: boolean;
  answers: {
    questionId: string;
    selectedOptionId: string;
    correct: boolean;
  }[];
}

/**
 * QuizAttemptGateway -- Contrato abstracto para intentos de quiz.
 *
 * Responsabilidad UNICA: persistir y consultar intentos de exámenes.
 *
 * Solo tiene 2 métodos porque solo hay 2 operaciones de negocio:
 *   1. Guardar un intento (con sus respuestas en cascade)
 *   2. Consultar el último intento (para el cooldown de 30 min)
 *
 * Consumidor único: SubmitQuizUseCase. Ningún otro use case necesita
 * saber de quiz attempts, así que ningún otro los inyecta.
 */
export abstract class QuizAttemptGateway {
  /**
   * Guarda un intento de quiz con sus respuestas individuales.
   * cascade: true en la entidad guarda las QuizAttemptAnswer automáticamente.
   */
  abstract saveQuizAttempt(
    data: CreateQuizAttemptData,
  ): Promise<QuizAttempt>;

  /**
   * Obtiene el último intento de un alumno en un quiz específico.
   * Se usa para el cooldown de 30 minutos.
   */
  abstract getLastQuizAttempt(
    userId: string,
    lessonId: string,
  ): Promise<QuizAttempt | null>;
}
