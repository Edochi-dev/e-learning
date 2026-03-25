import { Enrollment } from '../entities/enrollment.entity';
import { LessonProgress } from '../entities/lesson-progress.entity';
import { QuizAttempt } from '../entities/quiz-attempt.entity';

/**
 * EnrollmentGateway — Contrato abstracto para la capa de datos de Matrículas.
 *
 * Siguiendo el mismo patrón que CourseGateway: los Use Cases NUNCA hablan
 * directamente con la base de datos. Dependen de este contrato abstracto.
 *
 * La implementación real (EnrollmentsRepository) es la única que sabe de TypeORM.
 * Si en el futuro quisieras guardar matrículas en otro sistema, solo cambias
 * el binding en el module — los Use Cases no se tocan.
 */
export abstract class EnrollmentGateway {
  // --- Matrículas ---

  /** Crea una nueva matrícula para un usuario en un curso. */
  abstract enroll(userId: string, courseId: string): Promise<Enrollment>;

  /** Busca una matrícula por su ID. Usado por el OwnershipGuard. */
  abstract findById(id: string): Promise<Enrollment | null>;

  /** Busca una matrícula específica de un usuario en un curso. */
  abstract findByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | null>;

  /**
   * Devuelve todas las matrículas de un usuario, con el curso y sus lecciones cargadas.
   * Necesitamos las lecciones para calcular el total (totalLessons) en el Use Case.
   */
  abstract findByUserWithCourses(userId: string): Promise<Enrollment[]>;

  /** Elimina una matrícula (dar de baja de un curso). */
  abstract delete(id: string): Promise<void>;

  // --- Progreso de Lecciones ---

  /**
   * Trae TODO el progreso del usuario en UNA sola query, agrupado por courseId.
   *
   * Retorna un Record (objeto clave-valor) donde:
   *   - Clave   = courseId
   *   - Valor   = array de lessonIds completadas en ese curso
   *
   * Ejemplo: { 'uuid-curso-A': ['uuid-l1', 'uuid-l2'], 'uuid-curso-B': ['uuid-l5'] }
   *
   * Úsalo cuando necesites el progreso de VARIOS cursos a la vez (ej: lista de mis cursos).
   * Evita el problema N+1: siempre es 1 query sin importar cuántos cursos tenga el usuario.
   */
  abstract getCompletedLessonIdsByCourse(
    userId: string,
  ): Promise<Record<string, string[]>>;

  /**
   * Retorna los IDs de las lecciones completadas por un usuario dentro de un curso concreto.
   *
   * Úsalo cuando necesites el progreso de UN solo curso (ej: página de detalle del curso).
   * Para listas de cursos, usa getCompletedLessonIdsByCourse() para evitar N+1.
   */
  abstract getCompletedLessonIds(
    userId: string,
    courseId: string,
  ): Promise<string[]>;

  /**
   * Marca una lección como completada.
   * Es IDEMPOTENTE: si ya estaba completada, simplemente devuelve el registro existente.
   */
  abstract markLessonComplete(
    userId: string,
    lessonId: string,
  ): Promise<LessonProgress>;

  /**
   * Guarda (upsert) el porcentaje de video visto para una lección.
   * Solo actualiza si el nuevo percent es MAYOR al guardado (nunca retrocede).
   */
  abstract saveWatchProgress(
    userId: string,
    lessonId: string,
    percent: number,
  ): Promise<void>;

  /**
   * Devuelve, para un curso dado, el porcentaje visto por lección.
   * Retorna un Record lessonId → watchedPercent (solo lecciones con registro existente).
   */
  abstract getWatchProgressByCourse(
    userId: string,
    courseId: string,
  ): Promise<Record<string, number>>;

  // --- Quiz Attempts ---

  /**
   * Guarda un intento de quiz con sus respuestas individuales.
   * cascade: true en QuizAttempt guarda las QuizAttemptAnswer automáticamente.
   */
  abstract saveQuizAttempt(attempt: Partial<QuizAttempt>): Promise<QuizAttempt>;

  /**
   * Obtiene el último intento de un alumno en un quiz específico.
   * Se usa para el cooldown de 30 minutos: si submittedAt + 30min > ahora → rechazar.
   */
  abstract getLastQuizAttempt(
    userId: string,
    lessonId: string,
  ): Promise<QuizAttempt | null>;
}
