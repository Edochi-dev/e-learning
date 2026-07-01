import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Course } from '@maris-nails/shared';
import type { CourseGateway } from '../../gateways/CourseGateway';
import type {
    CorrectionGateway,
    AssignmentSubmission,
    PaginatedSubmissions,
} from '../../gateways/CorrectionGateway';

/**
 * CorrectionsAdminPage — Sub-panel de correcciones para la profesora.
 *
 * Dos pestañas:
 *   - "Pendientes": agrupadas por curso, colapsables, con botón Revisar
 *     que lleva a la cola tipo Tinder.
 *   - "Histórico": paginado con filtros por curso y mes.
 *     Solo muestra entregas ya revisadas (approved/rejected).
 *
 * Recibe DOS gateways (Clean Architecture):
 *   - CorrectionGateway: para las operaciones de correcciones
 *   - CourseGateway: para popular el dropdown de cursos del filtro
 *     (cada gateway es responsable de su dominio)
 */

interface Props {
    gateway: CorrectionGateway;
    courseGateway: CourseGateway;
}

type Tab = 'pending' | 'history';

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

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** Genera las opciones de los últimos 12 meses para el selector. */
function getLast12Months(): { label: string; month: number; year: number }[] {
    const months: { label: string; month: number; year: number }[] = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            label: d.toLocaleDateString('es', { month: 'long', year: 'numeric' }),
            month: d.getMonth() + 1,
            year: d.getFullYear(),
        });
    }

    return months;
}

const ITEMS_PER_PAGE = 20;
const monthOptions = getLast12Months();

export const CorrectionsAdminPage: React.FC<Props> = ({ gateway, courseGateway }) => {
    const [activeTab, setActiveTab] = useState<Tab>('pending');
    const [pending, setPending] = useState<AssignmentSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Carga pendientes al montar (siempre, para el badge)
    useEffect(() => {
        gateway.listPending()
            .then(setPending)
            .catch((err) => console.error('Error cargando pendientes', err))
            .finally(() => setIsLoading(false));
    }, [gateway]);

    const grouped = groupByCourse(pending);

    return (
        <div className="admin-page">
            <Link to="/admin" className="back-link">← Volver al Panel</Link>
            <div className="admin-header">
                <h1>Correcciones</h1>
                <p>Revisa las entregas de tus alumnas y da feedback.</p>
            </div>

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

            {activeTab === 'pending' ? (
                isLoading ? (
                    <p style={{ color: 'var(--text-muted)', marginTop: '1.5rem' }}>Cargando...</p>
                ) : (
                    <PendingTab grouped={grouped} />
                )
            ) : (
                <HistoryTab gateway={gateway} courseGateway={courseGateway} />
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

// ── Tab Histórico (con filtros y paginación) ───────────────────────────

interface HistoryTabProps {
    gateway: CorrectionGateway;
    courseGateway: CourseGateway;
}

const statusLabels: Record<string, { text: string; className: string }> = {
    approved: { text: 'Aprobada', className: 'status-approved' },
    rejected: { text: 'Rechazada', className: 'status-rejected' },
};

/**
 * HistoryTab — Histórico paginado con filtros por curso, status y mes.
 *
 * Maneja su propio estado (no depende del padre) porque:
 *   1. Los filtros y la paginación son internos a esta tab
 *   2. No necesita re-renderizar al padre cuando cambian
 *   3. Se monta/desmonta con la tab → limpia su estado solo
 */
const HistoryTab: React.FC<HistoryTabProps> = ({ gateway, courseGateway }) => {
    // Filtros locales (lo que el usuario está seleccionando)
    const [courseId, setCourseId] = useState('');
    const [status, setStatus] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');

    // Filtros aplicados (lo que se envió al backend)
    // Se separan de los locales para que el fetch solo ocurra al
    // pulsar "Aplicar", no en cada cambio de dropdown.
    const [appliedFilters, setAppliedFilters] = useState<{
        courseId: string; status: string; selectedMonth: string;
    }>({ courseId: '', status: '', selectedMonth: '' });

    // Datos
    const [courses, setCourses] = useState<Course[]>([]);
    const [result, setResult] = useState<PaginatedSubmissions | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);

    // Cargar lista de cursos para el dropdown
    useEffect(() => {
        courseGateway.findAll()
            .then((result) => setCourses(result.data))
            .catch((err) => console.error('Error cargando cursos', err));
    }, [courseGateway]);

    // Cargar histórico solo cuando cambian los filtros APLICADOS o la página
    const loadHistory = useCallback(() => {
        setIsLoading(true);

        const parsed = appliedFilters.selectedMonth
            ? {
                month: monthOptions[parseInt(appliedFilters.selectedMonth, 10)].month,
                year: monthOptions[parseInt(appliedFilters.selectedMonth, 10)].year,
            }
            : {};

        gateway.listHistory({
            status: appliedFilters.status || undefined,
            courseId: appliedFilters.courseId || undefined,
            ...parsed,
            page,
            limit: ITEMS_PER_PAGE,
        })
            .then(setResult)
            .catch((err) => console.error('Error cargando histórico', err))
            .finally(() => setIsLoading(false));
    }, [gateway, appliedFilters, page]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    const handleApply = () => {
        setAppliedFilters({ courseId, status, selectedMonth });
        setPage(1);
    };

    const submissions = result?.data ?? [];
    const total = result?.total ?? 0;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    return (
        <div style={{ marginTop: '1.5rem' }}>
            {/* Filtros */}
            <div className="history-filters">
                <select
                    className="history-filter-select"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                >
                    <option value="">Todos los cursos</option>
                    {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                </select>

                <select
                    className="history-filter-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                >
                    <option value="">Todos los estados</option>
                    <option value="approved">Aprobadas</option>
                    <option value="rejected">Rechazadas</option>
                </select>

                <select
                    className="history-filter-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                >
                    <option value="">Cualquier mes</option>
                    {monthOptions.map((m, i) => (
                        <option key={`${m.month}-${m.year}`} value={i}>{m.label}</option>
                    ))}
                </select>

                <button className="history-apply-btn" onClick={handleApply}>
                    Aplicar
                </button>
            </div>

            {/* Contenido */}
            {isLoading ? (
                <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Cargando...</p>
            ) : submissions.length === 0 ? (
                <div className="admin-empty" style={{ marginTop: '1rem' }}>
                    No hay correcciones que coincidan con los filtros.
                </div>
            ) : (
                <>
                    <div className="admin-course-links" style={{ marginTop: '1rem' }}>
                        {submissions.map((sub) => {
                            const st = statusLabels[sub.status] ?? statusLabels.approved;
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
                                        <span className={`correction-status ${st.className}`}>
                                            {st.text}
                                        </span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="history-pagination">
                            <button
                                className="history-page-btn"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                ← Anterior
                            </button>
                            <span className="history-page-info">
                                Página {page} de {totalPages}
                            </span>
                            <button
                                className="history-page-btn"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Siguiente →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
