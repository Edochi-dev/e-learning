import type {
    CorrectionGateway,
    AssignmentSubmission,
    CorrectionFilters,
    PaginatedSubmissions,
} from './CorrectionGateway';

/**
 * HttpCorrectionGateway — Implementación HTTP del contrato de correcciones.
 *
 * Endpoints del backend:
 *   GET    /corrections/pending      → listPending()
 *   GET    /corrections/history      → listHistory(filters)
 *   PATCH  /corrections/:id/review   → review(id, action, feedback)
 *
 * Mismo patrón que HttpCertificateGateway:
 *   - credentials: 'include' → envía la cookie JWT
 *   - JSON para body, query params para filtros
 *   - Error handling con mensaje del backend si disponible
 */
export class HttpCorrectionGateway implements CorrectionGateway {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async getById(submissionId: string): Promise<AssignmentSubmission> {
        const res = await fetch(`${this.baseUrl}/corrections/${submissionId}`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`Error al cargar entrega: ${res.statusText}`);
        return res.json() as Promise<AssignmentSubmission>;
    }

    async listPending(): Promise<AssignmentSubmission[]> {
        const res = await fetch(`${this.baseUrl}/corrections/pending`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`Error al listar pendientes: ${res.statusText}`);
        return res.json() as Promise<AssignmentSubmission[]>;
    }

    async listHistory(filters?: CorrectionFilters): Promise<PaginatedSubmissions> {
        const params = new URLSearchParams();
        if (filters?.status) params.set('status', filters.status);
        if (filters?.courseId) params.set('courseId', filters.courseId);
        if (filters?.month) params.set('month', String(filters.month));
        if (filters?.year) params.set('year', String(filters.year));
        if (filters?.page) params.set('page', String(filters.page));
        if (filters?.limit) params.set('limit', String(filters.limit));

        const query = params.toString();
        const url = `${this.baseUrl}/corrections/history${query ? `?${query}` : ''}`;

        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error(`Error al listar histórico: ${res.statusText}`);
        return res.json() as Promise<PaginatedSubmissions>;
    }

    // ── Métodos de alumna ──────────────────────────────────────────────

    async submit(lessonId: string, courseId: string, photo: File): Promise<AssignmentSubmission> {
        const body = new FormData();
        body.append('lessonId', lessonId);
        body.append('photo', photo);

        // courseId va como query param porque el EnrollmentGuard lo necesita
        // ANTES de que Multer parsee el body (guards corren antes que interceptors).
        const res = await fetch(`${this.baseUrl}/corrections/submit?courseId=${courseId}`, {
            method: 'POST',
            credentials: 'include',
            body,
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({})) as { message?: string };
            throw new Error(errBody.message ?? `Error al enviar entrega: ${res.statusText}`);
        }
        return res.json() as Promise<AssignmentSubmission>;
    }

    async getMyStatus(lessonId: string): Promise<AssignmentSubmission | null> {
        const res = await fetch(`${this.baseUrl}/corrections/me/${lessonId}`, {
            credentials: 'include',
        });
        if (!res.ok) {
            if (res.status === 404) return null;
            throw new Error(`Error al consultar estado: ${res.statusText}`);
        }
        const data = await res.json();
        // El backend retorna null si no hay submission
        return data ?? null;
    }

    // ── Métodos de admin ───────────────────────────────────────────────

    async review(
        submissionId: string,
        action: 'approve' | 'reject',
        feedback: string,
    ): Promise<AssignmentSubmission> {
        const res = await fetch(`${this.baseUrl}/corrections/${submissionId}/review`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action, feedback }),
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({})) as { message?: string };
            throw new Error(errBody.message ?? `Error al revisar entrega: ${res.statusText}`);
        }
        return res.json() as Promise<AssignmentSubmission>;
    }
}
