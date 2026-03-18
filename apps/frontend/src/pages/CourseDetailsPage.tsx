import { useParams, Link } from 'react-router-dom';
import type { CourseGateway } from '../gateways/CourseGateway';
import { useCourse } from '../hooks/useCourse';
import { API_URL as BACKEND_URL } from '../config';

interface CourseDetailsPageProps {
    gateway: CourseGateway;
}

/**
 * CourseDetailsPage — Página de detalle de un curso.
 *
 * Layout de 2 columnas:
 *   - Izquierda: thumbnail hero + timeline de lecciones
 *   - Derecha: card sticky con precio, stats y CTA de compra
 *
 * Las lecciones se muestran como un timeline numerado (no cards sueltas).
 * El número de cada lección viene del campo `order` si existe,
 * o del índice del array + 1 como fallback.
 *
 * La thumbnail se resuelve dinámicamente:
 *   - URLs absolutas (https://...) se usan directas
 *   - Rutas relativas (/static/...) se prefijan con BACKEND_URL
 */
export const CourseDetailsPage = ({ gateway }: CourseDetailsPageProps) => {
    const { id } = useParams<{ id: string }>();
    const { course, loading, error } = useCourse(gateway, id);

    if (loading) return (
        <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
            <div className="spinner" />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Cargando curso…</p>
        </div>
    );
    if (error) return (
        <div className="container" style={{ padding: '6rem 0', textAlign: 'center', color: 'var(--error, #e53e3e)' }}>
            Error: {error}
        </div>
    );
    if (!course) return (
        <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
            Curso no encontrado
        </div>
    );

    const thumbnailSrc = course.thumbnailUrl
        ? (course.thumbnailUrl.startsWith('http') ? course.thumbnailUrl : `${BACKEND_URL}${course.thumbnailUrl}`)
        : null;

    const sortedLessons = [...(course.lessons ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const totalDuration = sortedLessons.reduce((sum, l) => {
        const parts = l.duration?.split(':') ?? [];
        return sum + (parseInt(parts[0] ?? '0', 10) * 60 + parseInt(parts[1] ?? '0', 10));
    }, 0);
    const durationHours = Math.floor(totalDuration / 3600);
    const durationMins = Math.floor((totalDuration % 3600) / 60);
    const durationLabel = durationHours > 0
        ? `${durationHours}h ${durationMins}min`
        : `${durationMins} min`;

    return (
        <div className="cd-page">
            {/* ── Breadcrumb ── */}
            <div className="container">
                <Link to="/cursos" className="cd-back">
                    ← Volver al catálogo
                </Link>
            </div>

            {/* ── Hero ── */}
            <div className="container cd-hero">
                <div className="cd-hero__visual">
                    {thumbnailSrc ? (
                        <img src={thumbnailSrc} alt={course.title} className="cd-hero__img" />
                    ) : (
                        <div className="cd-hero__placeholder">💅</div>
                    )}
                </div>

                <div className="cd-hero__content">
                    <h1 className="cd-hero__title">{course.title}</h1>
                    <p className="cd-hero__desc">{course.description}</p>

                    <div className="cd-hero__stats">
                        <span className="cd-stat">
                            <span className="cd-stat__icon">📚</span>
                            {sortedLessons.length} lecciones
                        </span>
                        <span className="cd-stat">
                            <span className="cd-stat__icon">⏱️</span>
                            {durationLabel}
                        </span>
                        {sortedLessons.some(l => l.isLive) && (
                            <span className="cd-stat cd-stat--live">
                                <span className="cd-stat__icon">🔴</span>
                                Incluye sesión en vivo
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Body: 2 columnas ── */}
            <div className="container cd-body">
                {/* Columna izquierda: timeline */}
                <div className="cd-main">
                    <div className="cd-section-header">
                        <h2 className="cd-section-title">Contenido del Curso</h2>
                        <span className="cd-section-badge">
                            {sortedLessons.length} {sortedLessons.length === 1 ? 'lección' : 'lecciones'}
                        </span>
                    </div>

                    {sortedLessons.length > 0 ? (
                        <ol className="cd-timeline">
                            {sortedLessons.map((lesson, idx) => (
                                <li key={lesson.id} className="cd-timeline__item">
                                    <div className="cd-timeline__marker">
                                        <span className="cd-timeline__number">{idx + 1}</span>
                                    </div>
                                    <div className="cd-timeline__content">
                                        <div className="cd-timeline__header">
                                            <h3 className="cd-timeline__title">{lesson.title}</h3>
                                            <div className="cd-timeline__meta">
                                                {lesson.isLive && (
                                                    <span className="badge badge-live">EN VIVO</span>
                                                )}
                                                <span className="cd-timeline__duration">
                                                    {lesson.duration}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="cd-timeline__desc">{lesson.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <div className="empty-lessons">
                            Próximamente se añadirán las lecciones
                        </div>
                    )}
                </div>

                {/* Columna derecha: card de compra sticky */}
                <aside className="cd-sidebar">
                    <div className="cd-purchase-card">
                        <div className="cd-purchase-card__price">
                            <span className="cd-purchase-card__currency">$</span>
                            <span className="cd-purchase-card__amount">{course.price}</span>
                        </div>

                        <button className="btn-primary cd-purchase-card__cta">
                            Inscribirme Ahora
                        </button>

                        <ul className="cd-purchase-card__features">
                            <li>Acceso inmediato al contenido</li>
                            <li>{sortedLessons.length} lecciones en video</li>
                            <li>Certificado al completar</li>
                            <li>Acceso de por vida</li>
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    );
};
