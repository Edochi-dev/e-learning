/**
 * CorrectionGateway (Frontend) — Contrato para las operaciones de correcciones.
 *
 * Define QUÉ puede hacer el frontend con las correcciones.
 * La implementación concreta (HttpCorrectionGateway) sabe CÓMO hacerlas via HTTP.
 *
 * Dos roles usan este gateway:
 *   - Admin: listar pendientes, ver histórico, revisar (aprobar/rechazar)
 *   - Alumna: enviar foto, ver estado de su entrega (Fase 11 — por ahora solo admin)
 */

// ── Tipos de presentación ──────────────────────────────────────────────

export interface SubmissionStudent {
    id: string;
    fullName: string;
    email: string;
}

export interface SubmissionCourse {
    id: string;
    title: string;
}

export interface SubmissionLesson {
    id: string;
    title: string;
    course: SubmissionCourse;
}

export interface AssignmentData {
    referenceImageUrl: string;
    instructions: string;
}

/**
 * Una revisión de la profesora. Las anteriores a los audios no tienen audio
 * (ni fecha de vencimiento) y traen el comentario escrito en `transcript`.
 */
export interface CorrectionReview {
    id: string;
    decision: 'approved' | 'rejected';
    hasAudio: boolean;
    audioDurationSeconds: number | null;
    audioExpiresAt: string | null;
    transcript: string | null;
    transcriptStatus: 'pending' | 'processing' | 'done' | 'failed' | 'unavailable';
    reviewedAt: string;
}

export interface AssignmentSubmission {
    id: string;
    studentId: string;
    lessonId: string;
    photoUrl: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: string;
    reviewedAt: string | null;
    /** La más reciente primero. */
    reviews: CorrectionReview[];
    student: SubmissionStudent;
    lesson: SubmissionLesson & {
        assignmentData?: AssignmentData;
    };
}

// ── Filtros y paginación ──────────────────────────────────────────────

export interface CorrectionFilters {
    status?: string;
    courseId?: string;
    month?: number;
    year?: number;
    page?: number;
    limit?: number;
}

export interface PaginatedSubmissions {
    data: AssignmentSubmission[];
    total: number;
    page: number;
    limit: number;
}

// ── Contrato ───────────────────────────────────────────────────────────

export interface CorrectionGateway {
    /** Admin: obtiene una submission por su ID con todas las relaciones. */
    getById(submissionId: string): Promise<AssignmentSubmission>;

    /** Admin: lista entregas pendientes de revisión (status = 'pending'). */
    listPending(): Promise<AssignmentSubmission[]>;

    /** Admin: histórico paginado con filtros opcionales. */
    listHistory(filters?: CorrectionFilters): Promise<PaginatedSubmissions>;

    /** Admin: aprobar o rechazar una entrega con una nota de voz. */
    review(
        submissionId: string,
        action: 'approve' | 'reject',
        audio: Blob,
    ): Promise<CorrectionReview>;

    /** Alumna dueña o admin: descarga el audio de una revisión. */
    getReviewAudio(reviewId: string): Promise<Blob>;

    // ── Métodos de alumna ──────────────────────────────────────────────

    /** Alumna: enviar foto de la tarea. */
    submit(lessonId: string, courseId: string, photo: File): Promise<AssignmentSubmission>;

    /** Alumna: ver el estado de mi entrega para una lección. */
    getMyStatus(lessonId: string): Promise<AssignmentSubmission | null>;
}
