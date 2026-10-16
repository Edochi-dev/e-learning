import type { QuizResult, QuizAnswer, LastQuizAttemptResponse, UpcomingLiveClass, WatchProgressResult, CourseOverview } from '@maris-nails/shared';
import type { EnrollmentGateway, EnrollmentWithProgress, CourseStudent } from './EnrollmentGateway';
import type { HttpClient } from '../http/HttpClient';

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
    private readonly http: HttpClient;

    constructor(baseUrl: string, http: HttpClient) {
        this.baseUrl = baseUrl;
        this.http = http;
    }

    async getMyUpcomingLiveClasses(): Promise<UpcomingLiveClass[]> {
        const response = await this.http.fetch(`${this.baseUrl}/enrollments/me/live-classes`);
        if (!response.ok) throw new Error('No se pudieron cargar tus próximas clases');
        return response.json();
    }

    async getMyEnrollments(): Promise<EnrollmentWithProgress[]> {
        const response = await this.http.fetch(`${this.baseUrl}/enrollments/me`, {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('No se pudieron cargar tus cursos');
        }

        const data = await response.json() as EnrollmentWithProgress[];

        /*
         * Un backend anterior al acceso temporal no envía isActive. Durante un
         * despliegue conviven ambas versiones unos minutos, y el service worker
         * de la PWA puede alargar esa convivencia. Tratar el campo ausente como
         * "vencido" bloquearía a TODAS las alumnas a la vez.
         *
         * Asumir acceso no abre un agujero: quien autoriza de verdad es el
         * backend, que responde 403 si la matrícula no está vigente.
         */
        return data.map((enrollment) => ({
            ...enrollment,
            isActive: enrollment.isActive !== false,
            expiresAt: enrollment.expiresAt ?? null,
            daysRemaining: enrollment.daysRemaining ?? null,
        }));
    }

    async unenroll(enrollmentId: string): Promise<void> {
        const response = await this.http.fetch(`${this.baseUrl}/enrollments/${enrollmentId}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('No se pudo cancelar la inscripción');
        }
    }

    async markLessonComplete(lessonId: string, courseId: string): Promise<void> {
        const response = await this.http.fetch(`${this.baseUrl}/enrollments/me/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ lessonId, courseId }),
        });

        if (!response.ok) {
            throw new Error('No se pudo guardar el progreso');
        }
    }

    async getCourseProgress(courseId: string): Promise<{
        completedLessonIds: string[];
        watchProgress: Record<string, number>;
    }> {
        const response = await this.http.fetch(
            `${this.baseUrl}/enrollments/me/courses/${courseId}/progress`,
            { credentials: 'include' },
        );

        if (!response.ok) {
            throw new Error('No se pudo cargar el progreso del curso');
        }
        return response.json();
    }

    async saveWatchedSegments(lessonId: string, courseId: string, segments: number[]): Promise<WatchProgressResult> {
        // keepalive: el último envío (al cerrar la pestaña o cambiar de lección)
        // llega aunque la página ya no exista.
        const res = await this.http.fetch(`${this.baseUrl}/enrollments/me/watch-progress`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            keepalive: true,
            body: JSON.stringify({ lessonId, courseId, segments }),
        });
        if (!res.ok) throw new Error('No se pudo guardar el progreso del video');
        return res.json();
    }

    async getCourseOverview(courseId: string): Promise<CourseOverview> {
        const res = await this.http.fetch(`${this.baseUrl}/enrollments/me/courses/${courseId}/overview`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('No se pudo cargar tu avance en el curso');
        return res.json();
    }

    async submitQuiz(lessonId: string, courseId: string, answers: QuizAnswer[]): Promise<QuizResult> {
        const response = await this.http.fetch(`${this.baseUrl}/enrollments/me/quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ lessonId, courseId, answers }),
        });

        if (!response.ok) {
            const text = await response.text();
            let message = 'Error al enviar el quiz';
            try {
                const body = JSON.parse(text);
                message = body.message || message;
            } catch { /* usar mensaje default */ }
            throw new Error(message);
        }
        return response.json();
    }

    async getLastQuizAttempt(lessonId: string, courseId: string): Promise<LastQuizAttemptResponse> {
        const response = await this.http.fetch(
            `${this.baseUrl}/enrollments/me/quiz/${lessonId}/last-attempt?courseId=${courseId}`,
            { credentials: 'include' },
        );
        if (!response.ok) {
            throw new Error('Error al obtener el último intento');
        }
        return response.json();
    }

    // ── Administración ──

    async listCourseStudents(courseId: string): Promise<CourseStudent[]> {
        const response = await this.http.fetch(`${this.baseUrl}/enrollments/course/${courseId}`, {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('No se pudieron cargar las alumnas del curso');
        }
        return response.json();
    }

    async setEnrollmentExpiry(enrollmentId: string, expiresAt: string | null): Promise<void> {
        const response = await this.http.fetch(`${this.baseUrl}/enrollments/${enrollmentId}/expiry`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ expiresAt }),
        });

        if (!response.ok) {
            throw new Error('No se pudo actualizar el acceso');
        }
    }
}
