import { Enrollment } from '../entities/enrollment.entity';

/**
 * Datos con los que nace una matrícula. `expiresAt` se recibe ya resuelto (vía
 * Course.accessExpiresAt) en vez de derivarse aquí: el vencimiento queda
 * congelado en la fila y no vuelve a depender de la duración del curso.
 */
export interface NewEnrollment {
  userId: string;
  courseId: string;
  expiresAt: Date | null;
}

/**
 * EnrollmentGateway -- Contrato abstracto para la capa de datos de Matrículas.
 *
 * Responsabilidad UNICA: gestionar la relación usuario-curso (matrícula).
 *
 * Antes, este gateway era una god-class con 13 métodos cubriendo 4 responsabilidades.
 * Ahora solo tiene 5 métodos de matrículas puras. El resto se segregó en:
 *   - LessonProgressGateway  -> completar lecciones
 *   - WatchProgressGateway   -> porcentaje de video visto
 *   - QuizAttemptGateway     -> intentos de exámenes
 *
 * Esto aplica ISP (Interface Segregation Principle): cada Use Case
 * inyecta SOLO los gateways que necesita, no una super-interfaz de todo.
 */
export abstract class EnrollmentGateway {
  /** Crea una nueva matrícula para un usuario en un curso. */
  abstract enroll(data: NewEnrollment): Promise<Enrollment>;

  /** Reemplaza el vencimiento de una matrícula (extender o renovar acceso). */
  abstract updateExpiry(id: string, expiresAt: Date | null): Promise<void>;

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
}
