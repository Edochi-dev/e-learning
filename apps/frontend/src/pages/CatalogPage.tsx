import { Link } from 'react-router-dom';
import type { CourseGateway } from '../gateways/CourseGateway';
import { useCourses } from '../hooks/useCourses';

interface CatalogPageProps {
    gateway: CourseGateway;
}

export const CatalogPage = ({ gateway }: CatalogPageProps) => {
    const { courses, loading, error } = useCourses(gateway);
    const [featured, ...rest] = courses;

    return (
        <div className="catalog-page">

            {/* ─── ENCABEZADO ─────────────────────────────────── */}
            <section className="catalog-hero">
                <div className="container">
                    <p className="section-eyebrow">Formación profesional</p>
                    <h1>Programas</h1>
                    <p className="catalog-hero__subtitle">
                        Cada técnica, cada detalle y cada clase ha sido diseñada para llevarte
                        del punto donde estás al nivel que mereces.
                    </p>
                </div>
            </section>

            {/* ─── CURSOS ─────────────────────────────────────── */}
            <section className="container catalog-body">

                {loading && (
                    <p className="catalog-loading">Cargando programas...</p>
                )}

                {!loading && error && (
                    <p className="catalog-loading">No fue posible cargar los programas en este momento.</p>
                )}

                {!loading && !error && courses.length > 0 && (
                    <>
                        {/* Curso destacado — card horizontal grande */}
                        {featured && (
                            <article className="catalog-featured">
                                <div className="catalog-featured__content">
                                    <p className="catalog-featured__tag">Programa destacado</p>
                                    <span className="catalog-featured__badge">
                                        {featured.lessons?.some(l => l.isLive) ? 'Incluye clases en vivo' : 'Clase grabada'}
                                    </span>
                                    <h2>{featured.title}</h2>
                                    <p className="catalog-featured__desc">
                                        {featured.description}
                                    </p>
                                    <Link to={`/courses/${featured.id}`} className="btn-primary">
                                        Ver Programa Completo
                                    </Link>
                                </div>
                                <div className="catalog-featured__visual" aria-hidden="true">
                                    💅
                                </div>
                            </article>
                        )}

                        {/* Resto de cursos — grid editorial */}
                        {rest.length > 0 && (
                            <div className="catalog-grid">
                                {rest.map((course) => (
                                    <article key={course.id} className="catalog-card">
                                        <div className="catalog-card__visual" aria-hidden="true">
                                            💅
                                        </div>
                                        <div className="catalog-card__body">
                                            <span className="catalog-card__badge">
                                                {course.lessons?.some(l => l.isLive) ? 'Incluye clases en vivo' : 'Clase grabada'}
                                            </span>
                                            <h3 className="catalog-card__title">{course.title}</h3>
                                            <p className="catalog-card__desc">
                                                {course.description}
                                            </p>
                                            <div className="catalog-card__footer">
                                                <span className="catalog-card__lessons">
                                                    {course.lessons?.length
                                                        ? `${course.lessons.length} ${course.lessons.length === 1 ? 'lección' : 'lecciones'}`
                                                        : 'Temario disponible'}
                                                </span>
                                                <Link to={`/courses/${course.id}`} className="btn-secondary">
                                                    Ver Programa
                                                </Link>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {!loading && !error && courses.length === 0 && (
                    <div className="catalog-empty">
                        <p>Nuevos programas próximamente.<br />¡Mantente atenta a nuestras redes!</p>
                    </div>
                )}

            </section>
        </div>
    );
};
