import { useState } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useCountUp } from '../hooks/useCountUp';
import { useExitIntent } from '../hooks/useExitIntent';
import { SALES_LANDING, type SalesLandingStat } from '../content/salesLanding';
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

const Stat = ({ stat }: { stat: SalesLandingStat }) => {
    const [ref, value] = useCountUp(stat.value);
    return (
        <div className="sl-stat">
            <span className="sl-stat__value" ref={ref}>
                {stat.prefix}{value}{stat.suffix}
            </span>
            <span className="sl-stat__label">{stat.label}</span>
        </div>
    );
};

export const SalesLandingPage = () => {
    useScrollReveal();

    const c = SALES_LANDING;
    const whatsappUrl = buildWhatsappUrl(c.whatsappNumber, c.whatsappMessage);
    const exiting = useExitIntent();
    const [exitDismissed, setExitDismissed] = useState(false);
    const showExitModal = exiting && !exitDismissed;

    const cta = (variant: string, label = c.ctaLabel) => (
        <a
            href={whatsappUrl}
            className={`sl-cta sl-cta--${variant}`}
            target="_blank"
            rel="noopener noreferrer"
        >
            <span className="sl-cta__icon" aria-hidden="true">💬</span>
            {label}
        </a>
    );

    return (
        <div className="sl">
            <div className="sl-announce">
                <div className="sl-announce__track">
                    <span>{c.announcement}</span>
                    <span aria-hidden="true">{c.announcement}</span>
                </div>
            </div>

            {/* ─── HERO ─────────────────────────────────────────── */}
            <section className="sl-hero">
                <div className="sl-hero__glow" aria-hidden="true" />
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

                    <div className="sl-stats">
                        {c.stats.map((s) => <Stat key={s.label} stat={s} />)}
                    </div>
                </div>
            </section>

            {/* ─── CINTA ────────────────────────────────────────── */}
            <div className="sl-marquee" aria-hidden="true">
                <div className="sl-marquee__track">
                    {[0, 1].map((copy) => (
                        <div className="sl-marquee__group" key={copy}>
                            {c.marqueeWords.map((w) => (
                                <span className="sl-marquee__item" key={w}>{w}<i>✦</i></span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── DOLOR ────────────────────────────────────────── */}
            <section className="sl-section sl-pain reveal">
                <div className="sl-container sl-container--narrow">
                    <h2 className="sl-section__title">{c.painTitle}</h2>
                    <ul className="sl-pain__list">
                        {c.painPoints.map((p) => (
                            <li key={p}><span aria-hidden="true">😮‍💨</span>{p}</li>
                        ))}
                    </ul>
                    <p className="sl-pain__turn">{c.painTurn}</p>
                </div>
            </section>

            {/* ─── ANTES / DESPUÉS ──────────────────────────────── */}
            <section className="sl-section sl-section--alt reveal">
                <div className="sl-container">
                    <h2 className="sl-section__title">Lo que cambia</h2>
                    <div className="sl-transforms">
                        {c.transforms.map((t) => (
                            <div className="sl-transform" key={t.after}>
                                <p className="sl-transform__before">{t.before}</p>
                                <span className="sl-transform__arrow" aria-hidden="true">→</span>
                                <p className="sl-transform__after">{t.after}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── BENEFICIOS ───────────────────────────────────── */}
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

            {/* ─── PILA DE VALOR + PRECIO ───────────────────────── */}
            <section className="sl-section sl-section--alt reveal">
                <div className="sl-container sl-container--narrow">
                    <h2 className="sl-section__title">Todo lo que te llevas</h2>
                    <div className="sl-stack">
                        {c.valueStack.map((v) => (
                            <div className="sl-stack__row" key={v.item}>
                                <span className="sl-stack__check" aria-hidden="true">✓</span>
                                <span className="sl-stack__item">{v.item}</span>
                                <s className="sl-stack__worth">{v.worth}</s>
                            </div>
                        ))}

                        {c.bonuses.map((b) => (
                            <div className="sl-stack__row sl-stack__row--bonus" key={b.title}>
                                <span className="sl-stack__check" aria-hidden="true">{b.icon}</span>
                                <span className="sl-stack__item">
                                    <strong>BONO:</strong> {b.title}
                                    <em>{b.description}</em>
                                </span>
                                <s className="sl-stack__worth">{b.worth}</s>
                            </div>
                        ))}

                        <div className="sl-stack__total">
                            <span>Valor total</span>
                            <s>{c.totalWorth}</s>
                        </div>
                    </div>

                    <div className="sl-price">
                        <p className="sl-price__label">Tu inversión hoy</p>
                        <p className="sl-price__amount">{c.price}</p>
                        <p className="sl-price__note">{c.priceNote}</p>
                        {cta('price')}
                        <p className="sl-cta__hint">{c.ctaHint}</p>
                    </div>

                    <div className="sl-guarantee">
                        <span className="sl-guarantee__seal" aria-hidden="true">🛡️</span>
                        <div>
                            <h3>{c.guaranteeTitle}</h3>
                            <p>{c.guaranteeBody}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── TESTIMONIOS ──────────────────────────────────── */}
            <section className="sl-section reveal">
                <div className="sl-container">
                    <h2 className="sl-section__title">Lo que dicen las alumnas</h2>
                    <div className="sl-testimonials">
                        {c.testimonials.map((t, i) => (
                            <figure key={i} className="sl-testimonial">
                                <span className="sl-testimonial__stars" aria-hidden="true">★★★★★</span>
                                <blockquote>{t.quote}</blockquote>
                                <p className="sl-testimonial__result">{t.result}</p>
                                <figcaption>
                                    <strong>{t.author}</strong>
                                    <span>{t.detail}</span>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── PARA QUIÉN ───────────────────────────────────── */}
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

            {/* ─── PREGUNTAS ────────────────────────────────────── */}
            <section className="sl-section reveal">
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

            {/* ─── CIERRE ───────────────────────────────────────── */}
            <section className="sl-close reveal">
                <div className="sl-container sl-container--narrow">
                    <p className="sl-scarcity">{c.scarcityNote}</p>
                    <h2 className="sl-close__title">{c.closingHeadline}</h2>
                    <p className="sl-close__body">{c.closingBody}</p>
                    {cta('close')}
                    <p className="sl-cta__hint">{c.ctaHint}</p>
                </div>
            </section>

            {/* ─── PERSISTENTES ─────────────────────────────────── */}
            <div className="sl-sticky">{cta('sticky')}</div>

            <a
                href={whatsappUrl}
                className="sl-bubble"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Escribir por WhatsApp"
            >
                💬
            </a>

            {showExitModal && (
                <div className="sl-modal" role="dialog" aria-modal="true" aria-labelledby="sl-modal-title">
                    <div className="sl-modal__backdrop" onClick={() => setExitDismissed(true)} />
                    <div className="sl-modal__box">
                        <button
                            type="button"
                            className="sl-modal__close"
                            onClick={() => setExitDismissed(true)}
                            aria-label="Cerrar"
                        >
                            ✕
                        </button>
                        <span className="sl-modal__icon" aria-hidden="true">👋</span>
                        <h2 id="sl-modal-title">{c.exitTitle}</h2>
                        <p>{c.exitBody}</p>
                        {cta('modal', c.exitCtaLabel)}
                        <button
                            type="button"
                            className="sl-modal__dismiss"
                            onClick={() => setExitDismissed(true)}
                        >
                            Ahora no
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
