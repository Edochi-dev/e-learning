import type { EnrollmentGateway, EnrollmentWithProgress } from './EnrollmentGateway';

/**
 * HttpEnrollmentGateway — Implementación concreta que habla con el backend via fetch().
 *
 * Este es el único archivo del frontend que sabe qué URLs existen en la API
 * para el módulo de matrículas. Si las rutas cambian, solo cambias aquí.
 *
 * Patrón de autenticación: todas las rutas son /me (el userId sale del JWT en el servidor),
 * así que simplemente mandamos el token en el header Authorization.
 */
export class HttpEnrollmentGateway implements EnrollmentGateway {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async getMyEnrollments(token: string): Promise<EnrollmentWithProgress[]> {
        const response = await fetch(`${this.baseUrl}/enrollments/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            throw new Error('No se pudieron cargar tus cursos');
        }

        return response.json();
    }

    async enroll(courseId: string, token: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/enrollments/me`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ courseId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'No se pudo completar la inscripción');
        }
    }

    async unenroll(enrollmentId: string, token: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/enrollments/${enrollmentId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            throw new Error('No se pudo cancelar la inscripción');
        }
    }

    async markLessonComplete(lessonId: string, courseId: string, token: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/enrollments/me/progress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ lessonId, courseId }),
        });

        // 204 No Content = éxito, no hay body que parsear
        if (!response.ok) {
            throw new Error('No se pudo guardar el progreso');
        }
    }
}
