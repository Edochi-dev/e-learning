import { Link } from 'react-router-dom';
import type { EnrollmentGateway } from '../gateways/EnrollmentGateway';
import { useEnrollments } from '../hooks/useEnrollments';

const BACKEND_URL = 'http://localhost:3000';

interface MyCoursesPageProps {
    gateway: EnrollmentGateway;
}

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
                <div className="my-courses-page__loading">
                    <div className="spinner" />
                    <p>Cargando tus cursos...</p>
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

    return (
        <div className="container my-courses-page">
            <div className="my-courses-page__header">
                <h1>Mis Cursos</h1>
                <p className="my-courses-page__subtitle">
                    {enrollments.length > 0
                        ? `${enrollments.length} curso${enrollments.length > 1 ? 's' : ''} activo${enrollments.length > 1 ? 's' : ''}`
                        : 'Aún no estás inscrita en ningún curso'}
                </p>
            </div>

            {enrollments.length === 0 ? (
                <div className="my-courses-page__empty">
                    <p className="my-courses-page__empty-icon">📚</p>
                    <h2>Empieza tu formación</h2>
                    <p>Explora el catálogo y encuentra el curso perfecto para ti.</p>
                    <Link to="/catalogo" className="btn-primary">
                        Ver Catálogo
                    </Link>
                </div>
            ) : (
                <div className="enrollment-grid">
                    {enrollments.map((enrollment) => (
                        <article key={enrollment.enrollmentId} className="enrollment-card">
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

                                {/* CTA */}
                                <Link
                                    to={`/courses/${enrollment.course.id}`}
                                    className="enrollment-card__cta"
                                >
                                    {enrollment.progressPercent === 100
                                        ? 'Repasar curso'
                                        : enrollment.progressPercent > 0
                                            ? 'Continuar →'
                                            : 'Empezar →'}
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};
