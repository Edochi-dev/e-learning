import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { CourseGateway } from '../gateways/CourseGateway';
import { useCourses } from '../hooks/useCourses';

import { API_URL as BACKEND_URL } from '../config';

interface CatalogPageProps {
    gateway: CourseGateway;
}

// Etiquetas visibles de cada nivel (el valor guardado es el de CourseLevel).
const LEVEL_OPTIONS = [
    { value: 'beginner', label: 'Principiante' },
    { value: 'intermediate', label: 'Intermedio' },
    { value: 'advanced', label: 'Avanzado' },
];

export const CatalogPage = ({ gateway }: CatalogPageProps) => {
    const {
        courses, loading, error, page, totalPages, setPage,
        category, setCategory, level, setLevel, categories, setSearch,
    } = useCourses(gateway);
    const [featured, ...rest] = courses;

    // Buscador con debounce: escribimos en un estado local y, 400 ms después de
    // la última tecla, disparamos la búsqueda real (evita una petición por letra).
    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput), 400);
        return () => clearTimeout(t);
    }, [searchInput, setSearch]);

    // Cambia de página y lleva el scroll arriba para ver la nueva tanda.
    const goToPage = (next: number) => {
        setPage(next);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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

                {/* ─── FILTROS ─────────────────────────────────── */}
                <div
                    className="catalog-filters"
                    style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}
                >
                    <input
                        type="search"
                        className="form-input"
                        placeholder="Buscar programas…"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        style={{ flex: '1 1 220px', minWidth: '200px' }}
                    />
                    <select
                        className="form-input"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={{ flex: '0 1 200px' }}
                        aria-label="Filtrar por categoría"
                    >
                        <option value="">Todas las categorías</option>
                        {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <select
                        className="form-input"
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        style={{ flex: '0 1 180px' }}
                        aria-label="Filtrar por nivel"
                    >
                        <option value="">Todos los niveles</option>
                        {LEVEL_OPTIONS.map((l) => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                    </select>
                </div>

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
                                        {featured.lessons?.every(l => l.videoData?.isLive)
                                            ? 'Clases en vivo'
                                            : featured.lessons?.some(l => l.videoData?.isLive)
                                                ? 'Incluye clases en vivo'
                                                : 'Clases grabadas'}
                                    </span>
                                    <h2>{featured.title}</h2>
                                    <p className="catalog-featured__desc">
                                        {featured.description}
                                    </p>
                                    <Link to={`/courses/${featured.id}`} className="btn-primary">
                                        Ver Programa Completo
                                    </Link>
                                </div>
                                {/* aria-hidden="true": la imagen es decorativa porque el título
                                    ya está en el h2 adyacente — no aporta info extra al lector de pantalla */}
                                <div className="catalog-featured__visual" aria-hidden="true">
                                    {featured.thumbnailUrl
                                        ? <img src={`${BACKEND_URL}${featured.thumbnailUrl}`} alt="" className="course-thumbnail" />
                                        : '💅'
                                    }
                                </div>
                            </article>
                        )}

                        {/* Resto de cursos — grid editorial */}
                        {rest.length > 0 && (
                            <div className="catalog-grid">
                                {rest.map((course) => (
                                    <article key={course.id} className="catalog-card">
                                        <div className="catalog-card__visual" aria-hidden="true">
                                            {course.thumbnailUrl
                                                ? <img src={`${BACKEND_URL}${course.thumbnailUrl}`} alt="" className="course-thumbnail" />
                                                : '💅'
                                            }
                                        </div>
                                        <div className="catalog-card__body">
                                            <span className="catalog-card__badge">
                                                {course.lessons?.every(l => l.videoData?.isLive)
                                                    ? 'Clases en vivo'
                                                    : course.lessons?.some(l => l.videoData?.isLive)
                                                        ? 'Incluye clases en vivo'
                                                        : 'Clases grabadas'}
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

                {/* ─── PAGINACIÓN ─────────────────────────────────── */}
                {/* Solo cuando hay más de una página de resultados. */}
                {!loading && !error && totalPages > 1 && (
                    <nav className="catalog-pagination" aria-label="Paginación de programas">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => goToPage(page - 1)}
                            disabled={page <= 1}
                        >
                            ← Anterior
                        </button>
                        <span className="catalog-pagination__status" aria-live="polite">
                            Página {page} de {totalPages}
                        </span>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => goToPage(page + 1)}
                            disabled={page >= totalPages}
                        >
                            Siguiente →
                        </button>
                    </nav>
                )}

            </section>
        </div>
    );
};
