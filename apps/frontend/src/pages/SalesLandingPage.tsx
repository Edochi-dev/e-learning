import { useState } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { SALES_LANDING } from '../content/salesLanding';
import './SalesLandingPage.css';

const VIDEO_PLACEHOLDER = 'REEMPLAZAR';

function buildWhatsappUrl(number: string, message: string): string {
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * Fachada del video: pinta la miniatura y solo monta el iframe al pulsar.
 * El reproductor de YouTube arrastra cerca de un megabyte de scripts, y aquí
 * la mayoría de visitantes se va antes de darle al play.
 */
const VideoEmbed = ({ videoId }: { videoId: string }) => {
    const [playing, setPlaying] = useState(false);

    if (videoId === VIDEO_PLACEHOLDER) {
        return (
            <div className="sl-video sl-video--pending">
                <span className="sl-video__pending-icon">🎬</span>
                <p>Video pendiente: pon su identificador en <code>salesLanding.ts</code>.</p>
            </div>
        );
    }

    if (!playing) {
        return (
            <button
                type="button"
                className="sl-video sl-video__facade"
                onClick={() => setPlaying(true)}
                aria-label="Reproducir el video"
            >
                <img
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt=""
                    className="sl-video__thumb"
                    loading="lazy"
                />
                <span className="sl-video__play" aria-hidden="true">▶</span>
            </button>
        );
    }

    return (
        <div className="sl-video">
            <iframe
                className="sl-video__frame"
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                title="Video de presentación"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    );
};

export const SalesLandingPage = () => {
    useScrollReveal();

    const c = SALES_LANDING;
    const whatsappUrl = buildWhatsappUrl(c.whatsappNumber, c.whatsappMessage);

    const cta = (variant: string) => (
        <a
            href={whatsappUrl}
            className={`sl-cta sl-cta--${variant}`}
            target="_blank"
            rel="noopener noreferrer"
        >
            <span className="sl-cta__icon" aria-hidden="true">💬</span>
            {c.ctaLabel}
        </a>
    );

    return (
        <div className="sl">
            <section className="sl-hero">
                <div className="sl-container">
                    <p className="sl-eyebrow">{c.eyebrow}</p>
                    <h1 className="sl-hero__title">
                        {c.headline} <em>{c.headlineAccent}</em>
                    </h1>
                    <p className="sl-hero__sub">{c.subheadline}</p>

                    <VideoEmbed videoId={c.youtubeVideoId} />

                    <div className="sl-hero__actions">
                        {cta('hero')}
                        <p className="sl-cta__hint">{c.ctaHint}</p>
                    </div>
                </div>
            </section>

            <section className="sl-section reveal">
                <div className="sl-container">
                    <h2 className="sl-section__title">Qué incluye</h2>
                    <div className="sl-benefits">
                        {c.benefits.map((b) => (
                            <article key={b.title} className="sl-benefit">
                                <span className="sl-benefit__icon" aria-hidden="true">{b.icon}</span>
                                <h3 className="sl-benefit__title">{b.title}</h3>
                                <p className="sl-benefit__desc">{b.description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="sl-section sl-section--alt reveal">
                <div className="sl-container sl-fit">
                    <div className="sl-fit__col">
                        <h2 className="sl-fit__title">Esto es para ti si…</h2>
                        <ul className="sl-list sl-list--yes">
                            {c.forWhom.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                    </div>
                    <div className="sl-fit__col">
                        <h2 className="sl-fit__title">No es para ti si…</h2>
                        <ul className="sl-list sl-list--no">
                            {c.notForWhom.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                    </div>
                </div>
            </section>

            <section className="sl-section reveal">
                <div className="sl-container">
                    <h2 className="sl-section__title">Lo que dicen las alumnas</h2>
                    <div className="sl-testimonials">
                        {c.testimonials.map((t, i) => (
                            <figure key={i} className="sl-testimonial">
                                <blockquote>{t.quote}</blockquote>
                                <figcaption>
                                    <strong>{t.author}</strong>
                                    <span>{t.detail}</span>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            </section>

            <section className="sl-section sl-section--alt reveal">
                <div className="sl-container sl-container--narrow">
                    <h2 className="sl-section__title">Preguntas frecuentes</h2>
                    <div className="sl-faqs">
                        {c.faqs.map((f) => (
                            <details key={f.question} className="sl-faq">
                                <summary>{f.question}</summary>
                                <p>{f.answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="sl-close reveal">
                <div className="sl-container sl-container--narrow">
                    <p className="sl-scarcity">{c.scarcityNote}</p>
                    <h2 className="sl-close__title">{c.closingHeadline}</h2>
                    <p className="sl-close__body">{c.closingBody}</p>
                    {cta('close')}
                    <p className="sl-cta__hint">{c.ctaHint}</p>
                </div>
            </section>

            <div className="sl-sticky">
                {cta('sticky')}
            </div>
        </div>
    );
};
