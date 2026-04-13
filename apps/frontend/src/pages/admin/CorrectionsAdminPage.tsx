import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type {
    CorrectionGateway,
    AssignmentSubmission,
} from '../../gateways/CorrectionGateway';

/**
 * CorrectionsAdminPage — Sub-panel de correcciones para la profesora.
 *
 * Dos pestañas:
 *   - "Pendientes": entregas que esperan revisión, agrupadas por curso.
 *   - "Histórico": todas las entregas con filtros (Fase 10 — por ahora placeholder).
 *
 * Cada submission muestra: nombre de la alumna, lección, fecha de envío,
 * y un link para ir a la página de revisión (Fase 9).
 *
 * El agrupamiento por curso facilita que la profesora revise por bloques:
 * "primero todas las de Manicure Básico, luego las de Nail Art".
 */

interface Props {
    gateway: CorrectionGateway;
}

type Tab = 'pending' | 'history';

/**
 * Agrupa submissions por curso.
 *
 * Retorna un Map que preserva el orden de inserción:
 * la primera submission de cada curso determina su posición.
 * Como findPending ordena por submittedAt ASC (más antigua primero),
 * los cursos aparecen en el orden en que llegaron las primeras entregas.
 */
function groupByCourse(
    submissions: AssignmentSubmission[],
): Map<string, { courseTitle: string; items: AssignmentSubmission[] }> {
    const groups = new Map<string, { courseTitle: string; items: AssignmentSubmission[] }>();

    for (const sub of submissions) {
        const courseId = sub.lesson.course.id;
        const existing = groups.get(courseId);
        if (existing) {
            existing.items.push(sub);
        } else {
            groups.set(courseId, {
                courseTitle: sub.lesson.course.title,
                items: [sub],
            });
        }
    }

    return groups;
}

/** Formatea una fecha ISO a algo legible: "12 abr 2026, 15:30" */
function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export const CorrectionsAdminPage: React.FC<Props> = ({ gateway }) => {
    const [activeTab, setActiveTab] = useState<Tab>('pending');
    const [pending, setPending] = useState<AssignmentSubmission[]>([]);
    const [history, setHistory] = useState<AssignmentSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Cargar data según la tab activa
    useEffect(() => {
        setIsLoading(true);

        const load = activeTab === 'pending'
            ? gateway.listPending()
            : gateway.listHistory();

        load
            .then((data) => {
                if (activeTab === 'pending') setPending(data);
                else setHistory(data);
            })
            .catch((err) => console.error('Error cargando correcciones', err))
            .finally(() => setIsLoading(false));
    }, [gateway, activeTab]);

    const grouped = groupByCourse(pending);

    return (
        <div className="admin-page">
            <Link to="/admin" className="back-link">← Volver al Panel</Link>
            <div className="admin-header">
                <h1>Correcciones</h1>
                <p>Revisa las entregas de tus alumnas y da feedback.</p>
            </div>

            {/* Tabs */}
            <div className="admin-tabs">
                <button
                    className={`admin-tab ${activeTab === 'pending' ? 'admin-tab--active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pendientes
                    {pending.length > 0 && (
                        <span className="admin-badge" style={{ marginLeft: '0.5rem' }}>
                            {pending.length}
                        </span>
                    )}
                </button>
                <button
                    className={`admin-tab ${activeTab === 'history' ? 'admin-tab--active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    Histórico
                </button>
            </div>

            {/* Contenido de la tab */}
            {isLoading ? (
                <p style={{ color: 'var(--text-muted)', marginTop: '1.5rem' }}>Cargando...</p>
            ) : activeTab === 'pending' ? (
                <PendingTab grouped={grouped} />
            ) : (
                <HistoryTab submissions={history} />
            )}
        </div>
    );
};

// ── Tab Pendientes ─────────────────────────────────────────────────────

interface PendingTabProps {
    grouped: Map<string, { courseTitle: string; items: AssignmentSubmission[] }>;
}

const PendingTab: React.FC<PendingTabProps> = ({ grouped }) => {
    if (grouped.size === 0) {
        return (
            <div className="admin-empty" style={{ marginTop: '1.5rem' }}>
                No hay entregas pendientes de revisión.
            </div>
        );
    }

    return (
        <div style={{ marginTop: '1.5rem' }}>
            {Array.from(grouped.entries()).map(([courseId, group]) => (
                <div key={courseId} className="correction-group">
                    <h3 className="correction-group-title">
                        {group.courseTitle}
                        <span className="correction-group-count">
                            {group.items.length} pendiente{group.items.length !== 1 ? 's' : ''}
                        </span>
                    </h3>
                    <div className="admin-course-links">
                        {group.items.map((sub) => (
                            <SubmissionRow key={sub.id} submission={sub} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ── Tab Histórico (placeholder — Fase 10) ──────────────────────────────

interface HistoryTabProps {
    submissions: AssignmentSubmission[];
}

const HistoryTab: React.FC<HistoryTabProps> = ({ submissions }) => {
    if (submissions.length === 0) {
        return (
            <div className="admin-empty" style={{ marginTop: '1.5rem' }}>
                No hay correcciones en el histórico.
            </div>
        );
    }

    return (
        <div style={{ marginTop: '1.5rem' }}>
            <div className="admin-course-links">
                {submissions.map((sub) => (
                    <SubmissionRow key={sub.id} submission={sub} showStatus />
                ))}
            </div>
        </div>
    );
};

// ── Fila de una submission ─────────────────────────────────────────────

interface SubmissionRowProps {
    submission: AssignmentSubmission;
    showStatus?: boolean;
}

const statusLabels: Record<string, { text: string; className: string }> = {
    pending: { text: 'Pendiente', className: 'status-pending' },
    approved: { text: 'Aprobada', className: 'status-approved' },
    rejected: { text: 'Rechazada', className: 'status-rejected' },
};

const SubmissionRow: React.FC<SubmissionRowProps> = ({ submission, showStatus }) => {
    const status = statusLabels[submission.status] ?? statusLabels.pending;

    return (
        <div className="admin-course-row">
            <div className="correction-row-info">
                <span className="correction-row-student">
                    {submission.student.name}
                </span>
                <span className="correction-row-lesson">
                    {submission.lesson.title}
                </span>
                <span className="admin-course-link-meta">
                    {formatDate(submission.submittedAt)}
                    {showStatus && (
                        <span className={`correction-status ${status.className}`}>
                            {status.text}
                        </span>
                    )}
                </span>
            </div>
            <Link
                to={`/admin/correcciones/${submission.id}`}
                className="btn-primary"
                style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
                Revisar
            </Link>
        </div>
    );
};
