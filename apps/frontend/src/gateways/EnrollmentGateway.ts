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
 * Nota: todos los métodos reciben `token` porque estas rutas requieren JWT.
 * El token lo obtiene la página desde useAuth() y lo pasa al hook,
 * que a su vez lo pasa al gateway. Nunca accedemos a localStorage aquí.
 */
export interface EnrollmentGateway {
    /** Devuelve los cursos del usuario con su progreso calculado */
    getMyEnrollments(token: string): Promise<EnrollmentWithProgress[]>;

    /** Inscribe al usuario en un curso */
    enroll(courseId: string, token: string): Promise<void>;

    /** Elimina la matrícula (baja del curso) */
    unenroll(enrollmentId: string, token: string): Promise<void>;

    /** Marca una lección como completada */
    markLessonComplete(lessonId: string, courseId: string, token: string): Promise<void>;
}
