import type {
    CorrectionGateway,
    AssignmentSubmission,
    CorrectionReview,
    CorrectionFilters,
    PaginatedSubmissions,
} from './CorrectionGateway';
import type { HttpClient } from '../http/HttpClient';
import { recordingFileName } from '../lib/audio-recording';
import { readOptionalJson } from '../http/read-optional-json';

/**
 * HttpCorrectionGateway — Implementación HTTP del contrato de correcciones.
 *
 * Endpoints del backend:
 *   GET    /corrections/pending      → listPending()
 *   GET    /corrections/history      → listHistory(filters)
 *   PATCH  /corrections/:id/review   → review(id, action, audio)
 *   GET    /corrections/reviews/:id/audio → getReviewAudio(id)
 *
 * Mismo patrón que HttpCertificateGateway:
 *   - credentials: 'include' → envía la cookie JWT
 *   - JSON para body, query params para filtros
 *   - Error handling con mensaje del backend si disponible
 */
export class HttpCorrectionGateway implements CorrectionGateway {
    private readonly baseUrl: string;
    private readonly http: HttpClient;

    constructor(baseUrl: string, http: HttpClient) {
        this.baseUrl = baseUrl;
        this.http = http;
    }

    async getById(submissionId: string): Promise<AssignmentSubmission> {
        const res = await this.http.fetch(`${this.baseUrl}/corrections/${submissionId}`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error(`Error al cargar entrega: ${res.statusText}`);
        return res.json() as Promise<AssignmentSubmission>;
    }

    async listPending(): Promise<AssignmentSubmission[]> {
        const res = await this.http.fetch(`${this.baseUrl}/corrections/pending`, {
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

        const res = await this.http.fetch(url, { credentials: 'include' });
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
        const res = await this.http.fetch(`${this.baseUrl}/corrections/submit?courseId=${courseId}`, {
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
        const res = await this.http.fetch(`${this.baseUrl}/corrections/me/${lessonId}`, {
            credentials: 'include',
        });
        if (!res.ok) {
            if (res.status === 404) return null;
            throw new Error(`Error al consultar estado: ${res.statusText}`);
        }
        return readOptionalJson<AssignmentSubmission>(res);
    }

    // ── Métodos de admin ───────────────────────────────────────────────

    async review(
        submissionId: string,
        action: 'approve' | 'reject',
        audio: Blob,
    ): Promise<CorrectionReview> {
        const body = new FormData();
        body.append('action', action);
        body.append('audio', audio, recordingFileName(audio.type));

        const res = await this.http.fetch(`${this.baseUrl}/corrections/${submissionId}/review`, {
            method: 'PATCH',
            credentials: 'include',
            body,
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({})) as { message?: string };
            throw new Error(errBody.message ?? `Error al enviar la revisión: ${res.statusText}`);
        }
        return res.json() as Promise<CorrectionReview>;
    }

    // Se descarga como Blob a través del HttpClient (que renueva la sesión si
    // venció) en vez de poner la URL en <audio src>, que no puede renovarla.
    async getReviewAudio(reviewId: string): Promise<Blob> {
        const res = await this.http.fetch(`${this.baseUrl}/corrections/reviews/${reviewId}/audio`, {
            credentials: 'include',
        });
        if (!res.ok) {
            throw new Error(
                res.status === 403
                    ? 'Este audio ya no está disponible.'
                    : 'No pudimos cargar el audio.',
            );
        }
        return res.blob();
    }
}
