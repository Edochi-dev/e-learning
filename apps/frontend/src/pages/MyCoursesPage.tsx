import { Link } from 'react-router-dom';
import type { EnrollmentGateway } from '../gateways/EnrollmentGateway';
import { useEnrollments } from '../hooks/useEnrollments';

import { API_URL as BACKEND_URL } from '../config';
import { SkeletonCourseCard } from '../components/Skeleton';

interface MyCoursesPageProps {
    gateway: EnrollmentGateway;
}

/** A partir de aquí el aviso pasa a ser urgente en vez de informativo. */
const URGENT_THRESHOLD_DAYS = 7;

const accessLabel = (daysRemaining: number | null): string => {
    if (daysRemaining === null) return '';
    if (daysRemaining === 1) return 'Te queda 1 día';
    return `Te quedan ${daysRemaining} días`;
};

/**
 * MyCoursesPage — Lista de cursos en los que está matriculado el usuario.
 *
 * Recibe el gateway como prop (igual que todas las páginas del proyecto).
 * Nunca crea su propia instancia de gateway — eso es responsabilidad de App.tsx.
 *
 * ¿Por qué? Porque si la página creara el gateway internamente, sería imposible
 * testarla en aislamiento (no podrías inyectar un gateway falso en un test).
 * Con props, puedes pasar cualquier objeto que implemente la interfaz EnrollmentGateway.
 *
 * La barra de progreso:
 *   Es una barra CSS pura. El ancho del fill (la parte rellena) se controla
 *   con el style={{ width: `${progressPercent}%` }}. El CSS hace la animación.
 */
export const MyCoursesPage = ({ gateway }: MyCoursesPageProps) => {
    const { enrollments, loading, error } = useEnrollments(gateway);

    if (loading) {
        return (
            <div className="container my-courses-page">
                <div className="enrollment-grid">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonCourseCard key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container my-courses-page">
                <div className="my-courses-page__error">
                    <p>Ocurrió un error: {error}</p>
                </div>
            </div>
        );
    }

    // "Activos" debe significar activos: contar también los vencidos haría que
    // el encabezado contradijera las tarjetas de abajo.
    const activeCount = enrollments.filter((e) => e.isActive).length;
    const expiredCount = enrollments.length - activeCount;

    const subtitle = () => {
        if (enrollments.length === 0) return 'Aún no estás inscrita en ningún curso';

        const active = `${activeCount} curso${activeCount === 1 ? '' : 's'} activo${activeCount === 1 ? '' : 's'}`;
        if (expiredCount === 0) return active;

        return `${active} · ${expiredCount} vencido${expiredCount === 1 ? '' : 's'}`;
    };

    return (
        <div className="container my-courses-page">
            <div className="my-courses-page__header">
                <h1>Mis Cursos</h1>
                <p className="my-courses-page__subtitle">{subtitle()}</p>
            </div>

            {enrollments.length === 0 ? (
                <div className="my-courses-page__empty">
                    <p className="my-courses-page__empty-icon">📚</p>
                    <h2>Empieza tu formación</h2>
                    <p>Explora los cursos disponibles y encuentra el perfecto para ti.</p>
                    <Link to="/cursos" className="btn-primary">
                        Ver cursos
                    </Link>
                </div>
            ) : (
                <div className="enrollment-grid">
                    {enrollments.map((enrollment) => (
                        <article
                            key={enrollment.enrollmentId}
                            className={`enrollment-card${enrollment.isActive ? '' : ' enrollment-card--expired'}`}
                        >
                            {/* Miniatura del curso */}
                            <div className="enrollment-card__visual">
                                {enrollment.course.thumbnailUrl ? (
                                    <img
                                        src={`${BACKEND_URL}${enrollment.course.thumbnailUrl}`}
                                        alt={enrollment.course.title}
                                        className="course-thumbnail"
                                    />
                                ) : (
                                    <span className="enrollment-card__fallback">💅</span>
                                )}

                                {/* Solo los cursos con vencimiento muestran estado. */}
                                {!enrollment.isActive && (
                                    <span className="enrollment-card__access enrollment-card__access--expired">
                                        Acceso vencido
                                    </span>
                                )}
                                {enrollment.isActive &&
                                    enrollment.daysRemaining !== null &&
                                    enrollment.daysRemaining <= URGENT_THRESHOLD_DAYS && (
                                        <span className="enrollment-card__access enrollment-card__access--urgent">
                                            {accessLabel(enrollment.daysRemaining)}
                                        </span>
                                    )}
                            </div>

                            {/* Info del curso */}
                            <div className="enrollment-card__body">
                                <h3 className="enrollment-card__title">
                                    {enrollment.course.title}
                                </h3>
                                <p className="enrollment-card__desc">
                                    {enrollment.course.description}
                                </p>

                                {/* Barra de progreso */}
                                <div className="enrollment-card__progress">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-bar__fill"
                                            style={{ width: `${enrollment.progressPercent}%` }}
                                            role="progressbar"
                                            aria-valuenow={enrollment.progressPercent}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                        />
                                    </div>
                                    <div className="progress-bar__labels">
                                        <span className="progress-bar__text">
                                            {enrollment.completedLessons} / {enrollment.course.totalLessons} lecciones
                                        </span>
                                        <span className="progress-bar__percent">
                                            {enrollment.progressPercent}%
                                        </span>
                                    </div>
                                </div>

                                {/* Aviso de vencimiento: explica y ofrece salida. */}
                                {!enrollment.isActive && (
                                    <p className="enrollment-card__notice">
                                        Tu acceso a este curso terminó. Tu progreso y tus
                                        certificados se conservan: al renovar, sigues donde
                                        lo dejaste.
                                    </p>
                                )}

                                {/* CTA */}
                                {enrollment.isActive ? (
                                    <Link
                                        to={`/courses/${enrollment.course.id}/learn`}
                                        className="enrollment-card__cta"
                                    >
                                        {enrollment.progressPercent === 100
                                            ? 'Repasar curso'
                                            : enrollment.progressPercent > 0
                                                ? 'Continuar →'
                                                : 'Empezar →'}
                                    </Link>
                                ) : (
                                    <Link
                                        to={`/courses/${enrollment.course.id}`}
                                        className="enrollment-card__cta enrollment-card__cta--renew"
                                    >
                                        Renovar acceso
                                    </Link>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};
