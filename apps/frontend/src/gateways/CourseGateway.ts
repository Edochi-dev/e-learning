import type { Course, CreateCoursePayload, UpdateCoursePayload, Lesson, CreateLessonPayload, UpdateLessonPayload } from '@maris-nails/shared';

/**
 * CourseGateway (Frontend) — Contrato para las operaciones de cursos/lecciones
 *
 * Esta interfaz define QUÉ operaciones puede hacer el frontend.
 * La implementación concreta (HttpCourseGateway) sabe CÓMO hacerlas via HTTP.
 *
 * Es el mismo principio que en el backend: si mañana la API cambia a GraphQL,
 * solo cambiarías la implementación, no los componentes que la usan.
 */
export interface CourseGateway {
    // Cursos
    findAll(): Promise<Course[]>;
    findOne(id: string): Promise<Course>;
    create(course: CreateCoursePayload, thumbnail?: File): Promise<Course>;
    update(id: string, data: UpdateCoursePayload): Promise<Course>;
    delete(id: string): Promise<void>;

    // Lecciones
    addLesson(courseId: string, lesson: CreateLessonPayload): Promise<Lesson>;
    removeLesson(courseId: string, lessonId: string): Promise<void>;
    updateLesson(courseId: string, lessonId: string, data: UpdateLessonPayload): Promise<Lesson>;
    reorderLessons(courseId: string, lessonIds: string[]): Promise<void>;
}
