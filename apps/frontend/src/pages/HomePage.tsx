import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { CourseGateway } from '../gateways/CourseGateway';
import { useCourses } from '../hooks/useCourses';

import { API_URL as BACKEND_URL } from '../config';
import { smoothScrollToElement, getHeaderOffset } from '../lib/smoothScroll';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { FaqSection } from '../components/FaqSection';

interface HomePageProps {
    gateway: CourseGateway;
}

const PREVIEW_COUNT = 3;

// Fotos de galería — reemplaza `src` con rutas reales cuando Maria las entregue.
// Por ahora cada item tiene un gradiente de placeholder y una etiqueta descriptiva.
const GALLERY_ROW_1 = [
    { id: 1,  label: 'Certificación masiva · Santiago 2024',   gradient: 'linear-gradient(135deg,#3D0A1C,#9E1048)' },
    { id: 2,  label: 'Workshop acrílico escultórico',           gradient: 'linear-gradient(135deg,#1A0A2E,#6B1A6B)' },
    { id: 3,  label: 'Clausura promoción 2023',                 gradient: 'linear-gradient(135deg,#0A1A2D,#1A4A6B)' },
    { id: 4,  label: 'Técnica gel profesional',                 gradient: 'linear-gradient(135deg,#2A1A0A,#7A4A1A)' },
    { id: 5,  label: 'Certificación masiva · 80 alumnas',       gradient: 'linear-gradient(135deg,#1A2A0A,#3A6A2A)' },
    { id: 6,  label: 'Entrega de diplomas · Stgo',              gradient: 'linear-gradient(135deg,#2D0A1A,#8B1A3F)' },
];

const GALLERY_ROW_2 = [
    { id: 7,  label: 'Clínica presencial · Nail Art',           gradient: 'linear-gradient(135deg,#0A1A2E,#1A3A6B)' },
    { id: 8,  label: 'Masterclass Chrome & Mirror',             gradient: 'linear-gradient(135deg,#1A0A1A,#5C1A5C)' },
    { id: 9,  label: 'Práctica guiada semipermanente',          gradient: 'linear-gradient(135deg,#2A0A0A,#7A1A1A)' },
    { id: 10, label: 'Workshop express nail art',               gradient: 'linear-gradient(135deg,#0A2A1A,#1A6B4A)' },
    { id: 11, label: 'Certificación internacional',             gradient: 'linear-gradient(135deg,#2A1A0A,#8B5A0A)' },
    { id: 12, label: 'Talleres presenciales 2024',              gradient: 'linear-gradient(135deg,#1A0A2E,#3F0A6B)' },
];

// Placeholders para cuando aún no hay cursos en la BD
const STATIC_PREVIEWS = [
    {
        title: 'Uñas Acrílicas Esculpidas',
        badge: 'Clases grabadas',
        desc: 'Desde la preparación del natural hasta el diseño final. La base más demandada del mercado.',
    },
    {
        title: 'Nail Art Avanzado',
        badge: 'Clases grabadas',
        desc: 'Marble, chrome, texturas 3D y más. Para quienes quieren llevar su técnica a otro nivel.',
    },
    {
        title: 'Gel & Semipermanente',
        badge: 'Clases grabadas',
        desc: 'Aplicación impecable, durabilidad y remoción sin daño. El servicio que toda clienta exige.',
    },
];

export const HomePage = ({ gateway }: HomePageProps) => {
    const { courses, loading } = useCourses(gateway);
    const previewCourses = courses.slice(0, PREVIEW_COUNT);
    const location = useLocation();

    // Si venimos de otra página con la intención de ir a #contacto,
    // esperamos a que el DOM esté listo y hacemos scroll suave.
    useEffect(() => {
        const target = location.state?.scrollTo;
        if (target) {
            const timer = setTimeout(() => {
                smoothScrollToElement(target, { offset: getHeaderOffset() });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, []);

    // Anima la aparición de las secciones al ir bajando (fade + slide-up).
    useScrollReveal();

    return (
        <>
            {/* ─── HERO ──────────────────────────────────────────── */}
            <section className="hero">
                <div className="container hero__inner">

                    {/* Columna izquierda — texto */}
                    <div className="hero__content">
                        <h1 className="hero__heading">
                            Transforma<br />
                            Tu <em>Técnica.</em>
                        </h1>

                        <p className="hero__desc">
                            Formaciones premium para nail artists que buscan la excelencia.
                            Domina la técnica, define tu estilo y convierte tu talento en una
                            carrera rentable.
                        </p>

                        <div className="hero-actions">
                            <Link to="/cursos" className="btn-primary">
                                Ver Cursos
                            </Link>
                            <Link to="/certificados/buscar" className="btn-secondary">
                                🎓 Ya tengo certificado
                            </Link>
                        </div>
                    </div>

                    {/* Columna derecha — foto
                        Cuando Maria entregue la foto, reemplaza el div placeholder por:
                        <img src="/ruta-foto.jpg" alt="Trabajo de Maria Sandoval" className="hero__photo-img" />
                    */}
                    <div className="hero__photo">
                        <div className="hero__photo-placeholder">
                            <span className="hero__photo-emoji">💅</span>
                            <span className="hero__photo-label">Foto aquí</span>
                        </div>
                    </div>

                </div>
            </section>

            {/* ─── GALERÍA MARQUEE ─────────────────────────────── */}
            <section className="gallery-section reveal">
                <div className="container">
                    <p className="section-eyebrow">Certificaciones &amp; Talleres</p>
                    <p className="gallery-section__sub">
                        Más de 3000 alumnas certificadas en clases presenciales y online.
                    </p>
                </div>

                {/* Las fotos reales van en el atributo style={{ backgroundImage: `url(...)` }}.
                    Por ahora cada div muestra el gradiente placeholder. */}
                <div className="gallery-marquee">
                    <div className="gallery-track gallery-track--fwd">
                        {[...GALLERY_ROW_1, ...GALLERY_ROW_1].map((item, i) => (
                            <div
                                key={`${item.label}-${i}`}
                                className="gallery-item"
                                style={{ background: item.gradient }}
                            >
                                <span className="gallery-item__emoji">💅</span>
                                <span className="gallery-item__label">{item.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="gallery-track gallery-track--rev">
                        {[...GALLERY_ROW_2, ...GALLERY_ROW_2].map((item, i) => (
                            <div
                                key={`${item.label}-${i}`}
                                className="gallery-item"
                                style={{ background: item.gradient }}
                            >
                                <span className="gallery-item__emoji">🏆</span>
                                <span className="gallery-item__label">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <hr className="section-divider" />

            {/* ─── SOBRE LA EDUCADORA ───────────────────────────── */}
            <section id="sobre-mi" className="home-about reveal">
                <div className="container">
                    <div className="home-about__inner">
                        <div className="home-about__image-wrap">
                            <img src="/images/About-me.jpg" alt="Maria Sandoval" className="home-about__avatar" />
                        </div>
                        <div className="home-about__content">
                            <p className="section-eyebrow">Sobre la educadora</p>
                            <h2>
                                Maria <span className="home-about__name">Sandoval</span>
                            </h2>
                            <p className="home-about__role">
                                Fundadora de Mari's Nails Academy y educadora de la academia.
                            </p>
                            <p className="home-about__bio">
                                Mi historia comenzó enseñando desde lo más sencillo, con la convicción de
                                que una mujer con conocimiento, dirección y fe en sí misma puede transformar
                                su vida. Hoy, después de años formando profesionales, sigo creyendo que las
                                uñas no son solo técnica: son una herramienta de crecimiento, independencia
                                y propósito.
                            </p>
                            <p className="home-about__bio">
                                Mi metodología une técnica avanzada, pedagogía, corrección real, liderazgo y
                                visión de negocio, porque una nail artist completa no solo aprende a hacer
                                uñas hermosas: aprende a pensar como profesional, a enseñar con seguridad y a
                                construir una carrera sostenible.
                            </p>
                            <p className="home-about__bio">
                                Mi misión es acompañar a cada alumna a descubrir su valor, perfeccionar su
                                talento y convertirse en una profesional con criterio, identidad y autoridad.
                            </p>
                            <div className="home-stats">
                                <div className="stat-item">
                                    <span className="stat-value">3000+</span>
                                    <span className="stat-label">Alumnas</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">10+</span>
                                    <span className="stat-label">Años en educación</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">5+</span>
                                    <span className="stat-label">Certif. internac.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <hr className="section-divider" />

            {/* ─── PREVIEW DE CURSOS ───────────────────────────── */}
            <section className="home-preview reveal">
                <div className="container">
                    <div className="home-preview__header">
                        <p className="section-eyebrow">Aprende lo que el mercado exige</p>
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
                                                {course.lessons?.every(l => l.videoData?.isLive)
                                                    ? 'Clases en vivo'
                                                    : course.lessons?.some(l => l.videoData?.isLive)
                                                        ? 'Incluye clases en vivo'
                                                        : 'Clases grabadas'}
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
                                <Link to="/cursos" className="btn-primary">
                                    Ver todos los cursos
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
                                            <Link to="/cursos" className="preview-card__cta">
                                                Ver catálogo →
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <div className="preview-grid-cta">
                                <Link to="/cursos" className="btn-primary">
                                    Ver todos los cursos
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </section>

            <hr className="section-divider" />

            {/* ─── PREGUNTAS FRECUENTES ────────────────────────── */}
            <FaqSection />

            <hr className="section-divider" />

            {/* ─── CONTACTO ────────────────────────────────────── */}
            <section id="contacto" className="home-contact reveal">
                <div className="container">
                    <div className="home-contact__inner">
                        <p className="section-eyebrow">Ponte en contacto</p>
                        <p className="home-contact__subtitle">
                            ¿Tienes dudas sobre algún curso o problemas para comenzar tu formación?
                            Estamos aquí para orientarte.
                        </p>
                        <div className="contact-cards">
                            <a
                                href="https://wa.me/56946622112"
                                target="_blank"
                                rel="noreferrer"
                                className="contact-card contact-card--whatsapp"
                            >
                                <img src="/images/whatsapp.png" alt="Maria Sandoval" className="contact-card__photo" />
                                <div className="contact-card__body">
                                    <span className="contact-card__platform contact-card__platform--whatsapp">WhatsApp</span>
                                    <span className="contact-card__name">Maria Sandoval</span>
                                    <span className="contact-card__value">+56 9 4662 2112</span>
                                </div>
                                <span className="contact-card__cta">Enviar mensaje →</span>
                            </a>
                            <a
                                href="https://instagram.com/maris_nails_oficial"
                                target="_blank"
                                rel="noreferrer"
                                className="contact-card contact-card--instagram"
                            >
                                <img src="/images/instagram.jpg" alt="Maria Sandoval" className="contact-card__photo" />
                                <div className="contact-card__body">
                                    <span className="contact-card__platform contact-card__platform--instagram">Instagram</span>
                                    <span className="contact-card__name">Maria Sandoval</span>
                                    <span className="contact-card__value">@maris_nails_oficial</span>
                                </div>
                                <span className="contact-card__cta">Ver perfil →</span>
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};
