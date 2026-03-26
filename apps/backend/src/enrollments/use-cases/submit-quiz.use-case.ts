import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { CourseGateway } from '../../courses/gateways/course.gateway';
import { QuizResult, QuizResultDetail } from '@maris-nails/shared';

/**
 * SubmitQuizUseCase — Evalúa las respuestas del alumno y devuelve el resultado.
 *
 * Este es el Use Case más complejo del módulo de quizzes. Tiene 6 pasos:
 *
 * 1. OWNERSHIP CHECK — ¿El alumno está matriculado? (Seguridad)
 * 2. CARGAR PREGUNTAS — Traer la lección con sus preguntas y opciones
 * 3. VALIDAR TIPO — ¿Es realmente un examen?
 * 4. COOLDOWN — ¿Pasaron 30 minutos desde el último intento?
 * 5. EVALUAR — Comparar respuestas con las correctas
 * 6. GUARDAR + AUTO-COMPLETAR — Si aprobó, marcar lección como completada
 *
 * ¿Por qué toda esta lógica vive aquí y no en el Controller?
 * Porque esto es LÓGICA DE NEGOCIO pura. El Controller solo transforma HTTP → datos.
 * Si mañana este quiz se evalúa desde una app mobile o un CLI, la lógica no cambia.
 */

// Cooldown entre intentos: 30 minutos en milisegundos
const COOLDOWN_MS = 30 * 60 * 1000;

@Injectable()
export class SubmitQuizUseCase {
  constructor(
    private readonly enrollmentGateway: EnrollmentGateway,
    private readonly courseGateway: CourseGateway,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    courseId: string,
    answers: { questionId: string; selectedOptionId: string }[],
  ): Promise<QuizResult> {
    // ── Paso 1: Ownership check ──────────────────────────────────────
    // Mismo patrón que MarkLessonCompleteUseCase: verificar matrícula.
    const enrollment = await this.enrollmentGateway.findByUserAndCourse(
      userId,
      courseId,
    );
    if (!enrollment) {
      throw new ForbiddenException('No estás matriculado en este curso');
    }

    // ── Paso 2: Cargar la lección con preguntas ──────────────────────
    const lesson = await this.courseGateway.findLessonWithQuestions(lessonId);
    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }

    // ── Paso 3: Validar que es un examen ─────────────────────────────
    if (lesson.type !== 'exam') {
      throw new BadRequestException('Esta lección no es un examen');
    }

    // ── Paso 4: Cooldown de 30 minutos ───────────────────────────────
    // Buscamos el último intento. Si existe y fue hace menos de 30 min, rechazamos.
    // Esto obliga al alumno a repasar antes de reintentar.
    const lastAttempt = await this.enrollmentGateway.getLastQuizAttempt(
      userId,
      lessonId,
    );

    if (lastAttempt) {
      const elapsed = Date.now() - lastAttempt.submittedAt.getTime();
      if (elapsed < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - elapsed;
        const remainingMin = Math.ceil(remainingMs / 60_000);
        throw new HttpException(
          `Debes esperar ${remainingMin} minuto(s) antes de reintentar`,
          HttpStatus.TOO_MANY_REQUESTS, // 429
        );
      }
    }

    // ── Paso 5: Evaluar respuestas ───────────────────────────────────
    // Por cada pregunta, buscamos qué opción eligió el alumno y si es correcta.
    const questions = lesson.questions ?? [];

    // Creamos un Map para búsqueda O(1) por questionId
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    let score = 0;
    const details: QuizResultDetail[] = [];
    const attemptAnswers: {
      questionId: string;
      selectedOptionId: string;
      correct: boolean;
    }[] = [];

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue; // Pregunta inválida, la ignoramos

      // Buscar la opción correcta de esta pregunta
      const selectedOption = (question.options ?? []).find(
        (o) => o.id === answer.selectedOptionId,
      );
      const isCorrect = selectedOption?.isCorrect === true;

      if (isCorrect) score++;

      attemptAnswers.push({
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        correct: isCorrect,
      });

      // El detail para el frontend: si falló, incluimos la lección relacionada
      // para que vea "Repasa: [nombre lección]". Si acertó, no necesita hint.
      details.push({
        questionId: answer.questionId,
        correct: isCorrect,
        selectedOptionId: answer.selectedOptionId,
        relatedLessonId: !isCorrect ? question.relatedLessonId : undefined,
      });
    }

    const passingScore = lesson.examData?.passingScore ?? 1;
    const passed = score >= passingScore;

    // ── Paso 6: Guardar intento + auto-completar ─────────────────────
    await this.enrollmentGateway.saveQuizAttempt({
      userId,
      lessonId,
      score,
      passed,
      answers: attemptAnswers.map((a) => ({
        questionId: a.questionId,
        selectedOptionId: a.selectedOptionId,
        correct: a.correct,
      })),
    } as any);

    // Si aprobó, marcamos la lección como completada automáticamente.
    // Reutilizamos el mismo markLessonComplete que usa el flujo de video.
    // Es idempotente: si ya aprobó antes, no pasa nada.
    if (passed) {
      await this.enrollmentGateway.markLessonComplete(userId, lessonId);
    }

    // ── Resolver títulos de lecciones relacionadas ────────────────────
    // Para los hints "Repasa: [lección X]", necesitamos el título.
    // Cargamos el curso completo para obtener los títulos de las lecciones.
    const course = await this.courseGateway.findOne(courseId);
    const lessonTitleMap = new Map(
      (course?.lessons ?? []).map((l) => [l.id, l.title]),
    );

    // Enriquecer los details con los títulos de lecciones relacionadas
    for (const detail of details) {
      if (detail.relatedLessonId) {
        detail.relatedLessonTitle = lessonTitleMap.get(detail.relatedLessonId);
      }
    }

    return {
      passed,
      score,
      totalQuestions: questions.length,
      passingScore,
      details,
    };
  }
}
