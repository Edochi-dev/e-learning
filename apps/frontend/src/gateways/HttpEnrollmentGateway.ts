import type { QuizResult, QuizAnswer, LastQuizAttemptResponse } from '@maris-nails/shared';
import type { EnrollmentGateway, EnrollmentWithProgress, CourseStudent } from './EnrollmentGateway';

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

    async getCourseProgress(courseId: string): Promise<{
        completedLessonIds: string[];
        watchProgress: Record<string, number>;
    }> {
        const response = await fetch(
            `${this.baseUrl}/enrollments/me/courses/${courseId}/progress`,
            { credentials: 'include' },
        );

        if (!response.ok) {
            throw new Error('No se pudo cargar el progreso del curso');
        }
        return response.json();
    }

    async saveWatchProgress(lessonId: string, courseId: string, percent: number): Promise<void> {
        // Fire-and-forget: si falla (error de red, etc.) no interrumpimos la experiencia.
        // El progreso se reintentará en el siguiente umbral del 5%.
        fetch(`${this.baseUrl}/enrollments/me/watch-progress`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ lessonId, courseId, percent }),
        }).catch(() => { /* silencioso */ });
    }

    async submitQuiz(lessonId: string, courseId: string, answers: QuizAnswer[]): Promise<QuizResult> {
        const response = await fetch(`${this.baseUrl}/enrollments/me/quiz`, {
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
        const response = await fetch(
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
        const response = await fetch(`${this.baseUrl}/enrollments/course/${courseId}`, {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('No se pudieron cargar las alumnas del curso');
        }
        return response.json();
    }

    async setEnrollmentExpiry(enrollmentId: string, expiresAt: string | null): Promise<void> {
        const response = await fetch(`${this.baseUrl}/enrollments/${enrollmentId}/expiry`, {
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
