/**
 * EnrollmentWithProgress — los datos que devuelve el backend en GET /enrollments/me
 *
 * Nota: no importamos esto del paquete @maris-nails/shared porque es un tipo
 * específico del sistema de matrículas que todavía no está en el shared package.
 * Vive aquí hasta que sea necesario compartirlo con otras partes del sistema.
 */
export interface EnrollmentWithProgress {
    enrollmentId: string;
    enrolledAt: string;
    course: {
        id: string;
        title: string;
        description: string;
        thumbnailUrl: string | null;
        totalLessons: number;
    };
    completedLessons: number;
    progressPercent: number;
}

/**
 * EnrollmentGateway (Frontend) — Contrato para las operaciones de matrículas.
 *
 * Igual que CourseGateway: define QUÉ operaciones existen.
 * HttpEnrollmentGateway define CÓMO hacerlas via fetch().
 *
 * El JWT viaja automáticamente en una cookie HttpOnly — los métodos
 * ya no reciben token como parámetro.
 */
export interface EnrollmentGateway {
    /** Devuelve los cursos del usuario con su progreso calculado */
    getMyEnrollments(): Promise<EnrollmentWithProgress[]>;

    /** Inscribe al usuario en un curso */
    enroll(courseId: string): Promise<void>;

    /** Elimina la matrícula (baja del curso) */
    unenroll(enrollmentId: string): Promise<void>;

    /** Marca una lección como completada */
    markLessonComplete(lessonId: string, courseId: string): Promise<void>;

    /** Devuelve lecciones completadas y porcentaje visto por lección para un curso */
    getCourseProgress(courseId: string): Promise<{
        completedLessonIds: string[];
        watchProgress: Record<string, number>;
    }>;

    /** Guarda el porcentaje de video visto para una lección */
    saveWatchProgress(lessonId: string, courseId: string, percent: number): Promise<void>;
}
