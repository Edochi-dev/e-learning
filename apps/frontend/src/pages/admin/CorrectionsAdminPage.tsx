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
 *     Cada grupo tiene UN botón "Revisar" que lleva a la cola de revisión
 *     de ese curso (flujo tipo Tinder: una submission tras otra).
 *   - "Histórico": solo entregas ya revisadas (approved/rejected).
 *     Sin botones de acción — es un registro de lo que ya se hizo.
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

    useEffect(() => {
        setIsLoading(true);

        if (activeTab === 'pending') {
            gateway.listPending()
                .then(setPending)
                .catch((err) => console.error('Error cargando pendientes', err))
                .finally(() => setIsLoading(false));
        } else {
            // Histórico: solo approved y rejected, nunca pending
            gateway.listHistory()
                .then((data) => setHistory(data.filter((s) => s.status !== 'pending')))
                .catch((err) => console.error('Error cargando histórico', err))
                .finally(() => setIsLoading(false));
        }
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

            {/* Contenido */}
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
                <CourseGroup key={courseId} courseId={courseId} group={group} />
            ))}
        </div>
    );
};

/**
 * CourseGroup — Un grupo de pendientes de un curso, colapsable.
 *
 * Colapsado por defecto: solo muestra el header (nombre, conteo, botón).
 * La profesora puede expandir con click para ver quién entregó, pero
 * no necesita hacerlo — puede entrar directo con "Revisar".
 *
 * ¿Por qué cada grupo tiene su propio estado y no un Map en el padre?
 * Porque al ser componentes independientes, expandir uno no re-renderiza
 * los demás. Más eficiente y más simple.
 */
const CourseGroup: React.FC<{
    courseId: string;
    group: { courseTitle: string; items: AssignmentSubmission[] };
}> = ({ courseId, group }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="correction-group">
            <div className="correction-group-header">
                <button
                    className="correction-group-toggle"
                    onClick={() => setExpanded((prev) => !prev)}
                    aria-expanded={expanded}
                >
                    <span className={`correction-group-arrow ${expanded ? 'correction-group-arrow--open' : ''}`}>
                        ▸
                    </span>
                    <div>
                        <h3 className="correction-group-title">
                            {group.courseTitle}
                        </h3>
                        <span className="correction-group-count">
                            {group.items.length} entrega{group.items.length !== 1 ? 's' : ''} pendiente{group.items.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </button>
                <Link
                    to={`/admin/correcciones/curso/${courseId}`}
                    className="btn-primary"
                    style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                >
                    Revisar
                </Link>
            </div>

            {expanded && (
                <div className="correction-preview-list">
                    {group.items.map((sub) => (
                        <div key={sub.id} className="correction-preview-item">
                            <span className="correction-row-student">{sub.student.name}</span>
                            <span className="correction-row-lesson">{sub.lesson.title}</span>
                            <span className="admin-course-link-meta">{formatDate(sub.submittedAt)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Tab Histórico ──────────────────────────────────────────────────────

interface HistoryTabProps {
    submissions: AssignmentSubmission[];
}

const statusLabels: Record<string, { text: string; className: string }> = {
    approved: { text: 'Aprobada', className: 'status-approved' },
    rejected: { text: 'Rechazada', className: 'status-rejected' },
};

const HistoryTab: React.FC<HistoryTabProps> = ({ submissions }) => {
    if (submissions.length === 0) {
        return (
            <div className="admin-empty" style={{ marginTop: '1.5rem' }}>
                Aún no has revisado ninguna entrega.
            </div>
        );
    }

    return (
        <div style={{ marginTop: '1.5rem' }}>
            <div className="admin-course-links">
                {submissions.map((sub) => {
                    const status = statusLabels[sub.status] ?? statusLabels.approved;
                    return (
                        <div key={sub.id} className="correction-preview-item">
                            <span className="correction-row-student">{sub.student.name}</span>
                            <span className="correction-row-lesson">
                                {sub.lesson.title}
                                <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                                    — {sub.lesson.course.title}
                                </span>
                            </span>
                            <span className="admin-course-link-meta">
                                {formatDate(sub.reviewedAt ?? sub.submittedAt)}
                                <span className={`correction-status ${status.className}`}>
                                    {status.text}
                                </span>
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
