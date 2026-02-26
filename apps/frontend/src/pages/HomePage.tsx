import { Link } from 'react-router-dom';
import type { CourseGateway } from '../gateways/CourseGateway';
import { useCourses } from '../hooks/useCourses';

const BACKEND_URL = 'http://localhost:3000';

interface HomePageProps {
    gateway: CourseGateway;
}

const PREVIEW_COUNT = 3;

// Placeholders para cuando aún no hay cursos en la BD
const STATIC_PREVIEWS = [
    {
        title: 'Uñas Acrílicas Esculpidas',
        badge: 'Grabado',
        desc: 'Desde la preparación del natural hasta el diseño final. La base más demandada del mercado.',
    },
    {
        title: 'Nail Art Avanzado',
        badge: 'Grabado',
        desc: 'Marble, chrome, texturas 3D y más. Para quienes quieren llevar su técnica a otro nivel.',
    },
    {
        title: 'Gel & Semipermanente',
        badge: 'Grabado',
        desc: 'Aplicación impecable, durabilidad y remoción sin daño. El servicio que toda clienta exige.',
    },
];

export const HomePage = ({ gateway }: HomePageProps) => {
    const { courses, loading } = useCourses(gateway);
    const previewCourses = courses.slice(0, PREVIEW_COUNT);

    return (
        <>
            {/* ─── HERO ──────────────────────────────────────────── */}
            <section className="hero">
                <div className="container">
                    <p className="section-eyebrow">Mari's Nails Academy</p>
                    <h1>Transforma Tu Técnica,<br />Eleva Tu Profesión</h1>
                    <p>Formación premium en nail art para quienes toman su oficio en serio.</p>
                    <div className="hero-actions">
                        <Link to="/catalogo" className="btn-primary">
                            Ver Catálogo de Cursos
                        </Link>
                        <a
                            href="https://wa.me/525512345678"
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary"
                        >
                            💬 Escríbeme por WhatsApp
                        </a>
                    </div>
                </div>
            </section>

            <hr className="section-divider" />

            {/* ─── SOBRE LA EDUCADORA ───────────────────────────── */}
            <section id="sobre-mi" className="home-about">
                <div className="container">
                    <div className="home-about__inner">
                        <div className="home-about__image-wrap">
                            <div className="home-about__avatar" aria-hidden="true">👩‍🎨</div>
                        </div>
                        <div className="home-about__content">
                            <p className="section-eyebrow">Sobre la educadora</p>
                            <h2>
                                Mariana <span className="home-about__name">Salinas</span>
                            </h2>
                            <p className="home-about__role">Nail Artist & Educadora Certificada</p>
                            <p className="home-about__bio">
                                Con más de 12 años perfeccionando el arte de las uñas, he formado a cientos
                                de profesionales en México y Latinoamérica. Mi metodología combina técnica
                                impecable con creatividad auténtica — porque una nail artist completa domina
                                tanto el pincel como el negocio.
                            </p>
                            <p className="home-about__bio">
                                Certificada en México, España y EE.UU. Jueza en competencias nacionales de
                                nail art. Mi misión: que cada alumna salga con seguridad, estilo propio y
                                una carrera sostenible.
                            </p>
                            <div className="home-stats">
                                <div className="stat-item">
                                    <span className="stat-value">500+</span>
                                    <span className="stat-label">Alumnas</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">12</span>
                                    <span className="stat-label">Años de exp.</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">3</span>
                                    <span className="stat-label">Certif. internac.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <hr className="section-divider" />

            {/* ─── PREVIEW DE CURSOS ───────────────────────────── */}
            <section className="home-preview">
                <div className="container">
                    <div className="home-preview__header">
                        <p className="section-eyebrow">Programas destacados</p>
                        <h2>Aprende lo que el mercado exige</h2>
                        <p className="home-preview__subtitle">
                            Cada programa fue diseñado con base en la demanda real del sector.
                        </p>
                    </div>

                    {/* Cursos reales de la API */}
                    {!loading && previewCourses.length > 0 && (
                        <>
                            <div className="preview-grid">
                                {previewCourses.map((course) => (
                                    <article key={course.id} className="preview-card">
                                        <div className="preview-card__visual" aria-hidden="true">
                                            {course.thumbnailUrl
                                                ? <img src={`${BACKEND_URL}${course.thumbnailUrl}`} alt="" className="course-thumbnail" />
                                                : '💅'
                                            }
                                        </div>
                                        <div className="preview-card__body">
                                            <span className="preview-card__badge">
                                                {course.lessons?.some(l => l.isLive) ? 'Incluye clases en vivo' : 'Grabado'}
                                            </span>
                                            <h3 className="preview-card__title">{course.title}</h3>
                                            <p className="preview-card__desc">
                                                {course.description || 'Domina esta técnica con nuestra metodología paso a paso.'}
                                            </p>
                                            <Link to={`/courses/${course.id}`} className="preview-card__cta">
                                                Descubrir técnica →
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <div className="preview-grid-cta">
                                <Link to="/catalogo" className="btn-primary">
                                    Ver Catálogo Completo
                                </Link>
                            </div>
                        </>
                    )}

                    {/* Placeholders estáticos mientras no hay cursos en BD */}
                    {!loading && previewCourses.length === 0 && (
                        <>
                            <div className="preview-grid">
                                {STATIC_PREVIEWS.map((item, i) => (
                                    <article key={i} className="preview-card">
                                        <div className="preview-card__visual" aria-hidden="true">💅</div>
                                        <div className="preview-card__body">
                                            <span className="preview-card__badge">{item.badge}</span>
                                            <h3 className="preview-card__title">{item.title}</h3>
                                            <p className="preview-card__desc">{item.desc}</p>
                                            <Link to="/catalogo" className="preview-card__cta">
                                                Ver catálogo →
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <div className="preview-grid-cta">
                                <Link to="/catalogo" className="btn-primary">
                                    Ver Catálogo Completo
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </section>

            <hr className="section-divider" />

            {/* ─── REDES SOCIALES ──────────────────────────────── */}
            <section className="home-social">
                <div className="container">
                    <div className="home-social__inner">
                        <p className="section-eyebrow">Comunidad</p>
                        <h2>Sigamos en contacto</h2>
                        <p>
                            Comparto técnicas, novedades y contenido exclusivo todos los días.
                            Únete a la comunidad.
                        </p>
                        <div className="social-buttons">
                            <a
                                href="https://instagram.com/marisnaills"
                                target="_blank"
                                rel="noreferrer"
                                className="social-btn social-btn--instagram"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                                @marisnaills
                            </a>
                            <a
                                href="https://wa.me/525512345678"
                                target="_blank"
                                rel="noreferrer"
                                className="social-btn social-btn--whatsapp"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                Escríbeme por WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};
