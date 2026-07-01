import type { Course, CreateCoursePayload, UpdateCoursePayload, Lesson, CreateLessonPayload, UpdateLessonPayload, QuizQuestion, PaginatedResult } from '@maris-nails/shared';

/** Filtros opcionales del catálogo (búsqueda por texto + categoría/nivel). */
export interface CourseFilters {
    search?: string;
    category?: string;
    level?: string;
}

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
    // Paginado: devuelve la página pedida junto con el total (para calcular
    // cuántas páginas hay). page/limit son opcionales; por defecto la 1ª página.
    findAll(page?: number, limit?: number, filters?: CourseFilters): Promise<PaginatedResult<Course>>;
    /** Categorías distintas existentes, para el filtro del catálogo. */
    getCategories(): Promise<string[]>;
    findOne(id: string): Promise<Course>;
    create(course: CreateCoursePayload, thumbnail?: File): Promise<Course>;
    update(id: string, data: UpdateCoursePayload): Promise<Course>;
    updateThumbnail(id: string, file: File): Promise<Course>;
    deleteThumbnail(id: string): Promise<void>;
    delete(id: string): Promise<void>;

    // Imágenes
    uploadReferenceImage(file: File): Promise<string>;

    // Lecciones
    addLesson(courseId: string, lesson: CreateLessonPayload): Promise<Lesson>;
    removeLesson(courseId: string, lessonId: string): Promise<void>;
    updateLesson(courseId: string, lessonId: string, data: UpdateLessonPayload): Promise<Lesson>;
    reorderLessons(courseId: string, lessonIds: string[]): Promise<void>;

    // Quiz
    /** Obtiene las preguntas de un quiz SIN las respuestas correctas (isCorrect omitido) */
    getQuizQuestions(courseId: string, lessonId: string): Promise<QuizQuestion[]>;
}
