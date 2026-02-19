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

    // --- Operaciones de Lecciones ---
    abstract addLesson(courseId: string, lesson: Partial<Lesson>): Promise<Lesson>;
    abstract removeLesson(lessonId: string): Promise<void>;
    abstract findLesson(lessonId: string): Promise<Lesson | null>;
    abstract updateLesson(lessonId: string, data: Partial<Lesson>): Promise<Lesson>;

    /**
     * Verifica si alguna OTRA lección (distinta a excludeLessonId) usa esta videoUrl.
     * Esto es clave para la lógica de huérfanos: antes de borrar un archivo,
     * nos aseguramos de que ninguna otra lección lo necesite.
     */
    abstract isVideoUrlReferenced(videoUrl: string, excludeLessonId: string): Promise<boolean>;
}
