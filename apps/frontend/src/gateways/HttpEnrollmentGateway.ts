import type { EnrollmentGateway, EnrollmentWithProgress } from './EnrollmentGateway';

/**
 * HttpEnrollmentGateway — Implementación concreta que habla con el backend via fetch().
 *
 * Este es el único archivo del frontend que sabe qué URLs existen en la API
 * para el módulo de matrículas. Si las rutas cambian, solo cambias aquí.
 *
 * Patrón de autenticación: el JWT viaja en una cookie HttpOnly que el browser
 * envía automáticamente con credentials: 'include'.
 */
export class HttpEnrollmentGateway implements EnrollmentGateway {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async getMyEnrollments(): Promise<EnrollmentWithProgress[]> {
        const response = await fetch(`${this.baseUrl}/enrollments/me`, {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('No se pudieron cargar tus cursos');
        }

        return response.json();
    }

    async enroll(courseId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/enrollments/me`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ courseId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'No se pudo completar la inscripción');
        }
    }

    async unenroll(enrollmentId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/enrollments/${enrollmentId}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('No se pudo cancelar la inscripción');
        }
    }

    async markLessonComplete(lessonId: string, courseId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/enrollments/me/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ lessonId, courseId }),
        });

        if (!response.ok) {
            throw new Error('No se pudo guardar el progreso');
        }
    }
}
