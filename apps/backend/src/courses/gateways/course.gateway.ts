import { Course, Lesson } from '@maris-nails/shared';

/**
 * CourseGateway — Contrato abstracto para la capa de datos de Cursos
 *
 * En Clean Architecture, los Use Cases NUNCA hablan directamente con la base de datos.
 * En vez de eso, dependen de este gateway abstracto. Esto tiene dos beneficios:
 *
 * 1. TESTABILIDAD: En tests, puedes crear un gateway "falso" (mock) sin base de datos.
 * 2. FLEXIBILIDAD: Puedes cambiar de PostgreSQL a MongoDB sin tocar los Use Cases.
 *
 * Cada método aquí es una operación que los Use Cases necesitan.
 * La implementación real (CoursesRepository) es quien sabe de TypeORM y PostgreSQL.
 */
export abstract class CourseGateway {
    // --- Operaciones de Cursos ---
    abstract create(course: Course): Promise<Course>;
    abstract findAll(): Promise<Course[]>;
    abstract findOne(id: string): Promise<Course | null>;
    abstract update(id: string, data: Partial<Course>): Promise<Course>;
    abstract delete(id: string): Promise<void>;

    // --- Operaciones de Lecciones ---
    abstract addLesson(courseId: string, lesson: Partial<Lesson>): Promise<Lesson>;
    abstract removeLesson(lessonId: string): Promise<void>;
    abstract findLesson(lessonId: string): Promise<Lesson | null>;
    abstract updateLesson(lessonId: string, data: Partial<Lesson>): Promise<Lesson>;

    /**
     * ¿Alguna OTRA lección (distinta a excludeLessonId) usa esta videoUrl?
     *
     * Se usa en UPDATE: la lección sigue existiendo en la DB mientras actualizamos,
     * por eso hay que excluirla del conteo para no contarse a sí misma.
     */
    abstract isVideoUrlReferenced(videoUrl: string, excludeLessonId: string): Promise<boolean>;

    /**
     * ¿Alguna lección (cualquiera) usa este videoUrl?
     *
     * Se usa en DELETE: la lección/curso ya fue borrado de la DB antes de llamar esto,
     * así que no hace falta excluir nada. Si alguien lo referencia, no es huérfano.
     */
    abstract isVideoUrlInUse(videoUrl: string): Promise<boolean>;

    /**
     * ¿Algún curso (cualquiera) usa esta thumbnailUrl?
     *
     * Mismo razonamiento que isVideoUrlInUse: se llama después de borrar el curso,
     * así que no hace falta exclusión.
     */
    abstract isThumbnailUrlInUse(thumbnailUrl: string): Promise<boolean>;

    /**
     * Recibe un array de IDs de lecciones en el nuevo orden deseado
     * y actualiza el campo `order` de cada una en la base de datos.
     */
    abstract reorderLessons(courseId: string, lessonIds: string[]): Promise<void>;
}
