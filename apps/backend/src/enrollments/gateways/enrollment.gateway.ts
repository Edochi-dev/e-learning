import { Enrollment } from '../entities/enrollment.entity';
import { LessonProgress } from '../entities/lesson-progress.entity';

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
    abstract findByUserAndCourse(userId: string, courseId: string): Promise<Enrollment | null>;

    /**
     * Devuelve todas las matrículas de un usuario, con el curso y sus lecciones cargadas.
     * Necesitamos las lecciones para calcular el total (totalLessons) en el Use Case.
     */
    abstract findByUserWithCourses(userId: string): Promise<Enrollment[]>;

    /** Elimina una matrícula (dar de baja de un curso). */
    abstract delete(id: string): Promise<void>;

    // --- Progreso de Lecciones ---

    /**
     * Retorna los IDs de las lecciones completadas por un usuario dentro de un curso.
     * Requiere un JOIN entre lesson_progress y lessons para filtrar por courseId.
     */
    abstract getCompletedLessonIds(userId: string, courseId: string): Promise<string[]>;

    /**
     * Marca una lección como completada.
     * Es IDEMPOTENTE: si ya estaba completada, simplemente devuelve el registro existente.
     */
    abstract markLessonComplete(userId: string, lessonId: string): Promise<LessonProgress>;
}
