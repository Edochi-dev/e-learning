import { LessonProgress } from '../entities/lesson-progress.entity';

/**
 * LessonProgressGateway -- Contrato abstracto para el progreso de lecciones.
 *
 * Responsabilidad UNICA: saber si un alumno completó una lección o no.
 *
 * Antes, estos métodos vivían en EnrollmentGateway junto con matrículas,
 * video progress y quiz attempts. Eso violaba ISP: un Use Case que solo
 * necesitaba marcar una lección como completa dependía de 13 métodos.
 *
 * Ahora cada Use Case inyecta SOLO lo que necesita:
 *   - MarkLessonCompleteUseCase  -> LessonProgressGateway
 *   - GetMyEnrollmentsUseCase    -> LessonProgressGateway
 *   - GetCourseProgressUseCase   -> LessonProgressGateway
 *   - SubmitQuizUseCase          -> LessonProgressGateway (auto-completar al aprobar)
 */
export abstract class LessonProgressGateway {
  /**
   * Marca una lección como completada de forma idempotente.
   * Si ya estaba completada, devuelve el registro existente sin error.
   */
  abstract markLessonComplete(
    userId: string,
    lessonId: string,
  ): Promise<LessonProgress>;

  /**
   * Retorna los IDs de lecciones completadas en un curso específico.
   * Usa esto para la página de detalle de UN solo curso.
   */
  abstract getCompletedLessonIds(
    userId: string,
    courseId: string,
  ): Promise<string[]>;

  /**
   * Trae TODO el progreso del usuario en UNA sola query, agrupado por courseId.
   *
   * Retorna: { 'courseId-A': ['lessonId-1', 'lessonId-2'], 'courseId-B': ['lessonId-5'] }
   *
   * Usa esto cuando necesites el progreso de VARIOS cursos (lista de mis cursos).
   * Evita el problema N+1: siempre es 1 query sin importar cuántos cursos tenga.
   */
  abstract getCompletedLessonIdsByCourse(
    userId: string,
  ): Promise<Record<string, string[]>>;
}
