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
    name: string;
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

export interface AssignmentSubmission {
    id: string;
    studentId: string;
    lessonId: string;
    photoUrl: string;
    status: 'pending' | 'approved' | 'rejected';
    feedback: string | null;
    submittedAt: string;
    reviewedAt: string | null;
    student: SubmissionStudent;
    lesson: SubmissionLesson;
}

// ── Filtros para el histórico ──────────────────────────────────────────

export interface CorrectionFilters {
    status?: string;
    lessonId?: string;
    studentId?: string;
}

// ── Contrato ───────────────────────────────────────────────────────────

export interface CorrectionGateway {
    /** Admin: lista entregas pendientes de revisión (status = 'pending'). */
    listPending(): Promise<AssignmentSubmission[]>;

    /** Admin: histórico completo con filtros opcionales. */
    listHistory(filters?: CorrectionFilters): Promise<AssignmentSubmission[]>;

    /** Admin: aprobar o rechazar una entrega con feedback obligatorio. */
    review(
        submissionId: string,
        action: 'approve' | 'reject',
        feedback: string,
    ): Promise<AssignmentSubmission>;
}
