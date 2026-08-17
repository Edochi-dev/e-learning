import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { QuizAttemptGateway } from '../gateways/quiz-attempt.gateway';
import { CourseGateway } from '../../courses/gateways/course.gateway';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';
import {
  LastQuizAttemptResponse,
  QuizResultDetail,
} from '@maris-nails/shared';

/**
 * GetLastQuizAttemptUseCase — Obtiene el último intento de un alumno en
 * un quiz específico, reconstruido al formato QuizResult + cooldown.
 *
 * ¿Para qué existe?
 * El QuizPlayer del frontend necesita saber, al montar, si debe mostrar:
 *   - El formulario de preguntas (primer intento o cooldown vencido sin aprobar)
 *   - La pantalla de resultados APROBADA (permanente — no puede re-intentar)
 *   - La pantalla de resultados REPROBADA con countdown (cooldown vigente)
 *
 * Reconstruye el resultado a partir de los QuizAttemptAnswer guardados.
 * Esto mantiene la "verdad histórica" del intento aunque el admin edite
 * las preguntas después (mismo patrón que `correct: boolean` en answer —
 * el resultado queda congelado al momento de la evaluación).
 *
 * Devuelve null si no hay intentos previos → el frontend muestra el
 * formulario sin rehacer ninguna gestión de state.
 */

// Cooldown entre intentos: 30 minutos. Debe coincidir con SubmitQuizUseCase.
const COOLDOWN_MS = 30 * 60 * 1000;

@Injectable()
export class GetLastQuizAttemptUseCase {
  constructor(
    private readonly quizAttemptGateway: QuizAttemptGateway,
    private readonly courseGateway: CourseGateway,
    private readonly lessonGateway: LessonGateway,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    courseId: string,
  ): Promise<LastQuizAttemptResponse> {
    // ── Ownership check ─────────────────────────────────────────────
    // ── Cargar la lección con preguntas (para enriquecer los details) ──
    const lesson = await this.lessonGateway.findLessonWithQuestions(lessonId);
    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }
    if (lesson.type !== 'exam') {
      throw new BadRequestException('Esta lección no es un examen');
    }

    // ── Último intento ──────────────────────────────────────────────
    const lastAttempt = await this.quizAttemptGateway.getLastQuizAttempt(
      userId,
      lessonId,
    );
    if (!lastAttempt) {
      // Sin intentos previos: devolvemos result: null para que NestJS
      // serialice un JSON válido ({ result: null, cooldownRemainingMs: 0 }).
      // Si returnearamos null directo, NestJS envía body vacío y el
      // frontend rompe en response.json().
      return { result: null, cooldownRemainingMs: 0 };
    }

    // ── Reconstruir QuizResultDetail por cada respuesta guardada ────
    // Usamos el `correct` guardado en QuizAttemptAnswer (verdad histórica),
    // NO recalculamos. Para el hint "Repasa: [lección]" necesitamos
    // cruzar con la pregunta actual para saber su relatedLessonId.
    const questions = lesson.questions ?? [];
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    const details: QuizResultDetail[] = lastAttempt.answers.map((a) => {
      const question = questionMap.get(a.questionId);
      return {
        questionId: a.questionId,
        selectedOptionId: a.selectedOptionId,
        correct: a.correct,
        relatedLessonId:
          !a.correct && question?.relatedLessonId
            ? question.relatedLessonId
            : undefined,
      };
    });

    // Enriquecer con los títulos de las lecciones relacionadas (para los
    // hints "Repasa: [título]"). Mismo patrón que SubmitQuizUseCase.
    const course = await this.courseGateway.findOne(courseId);
    const lessonTitleMap = new Map(
      (course?.lessons ?? []).map((l) => [l.id, l.title]),
    );
    for (const detail of details) {
      if (detail.relatedLessonId) {
        detail.relatedLessonTitle = lessonTitleMap.get(detail.relatedLessonId);
      }
    }

    const passingScore = lesson.examData?.passingScore ?? 1;

    // ── Calcular cooldownRemainingMs ────────────────────────────────
    // Solo aplica cuando el intento fue REPROBADO y el cooldown no venció.
    // Si aprobó, no hay cooldown — puede mantenerse indefinidamente en
    // la pantalla de resultados.
    let cooldownRemainingMs = 0;
    if (!lastAttempt.passed) {
      const elapsed = Date.now() - lastAttempt.submittedAt.getTime();
      if (elapsed < COOLDOWN_MS) {
        cooldownRemainingMs = COOLDOWN_MS - elapsed;
      }
    }

    return {
      result: {
        passed: lastAttempt.passed,
        score: lastAttempt.score,
        totalQuestions: questions.length,
        passingScore,
        details,
      },
      cooldownRemainingMs,
    };
  }
}
