import { useState } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useCountUp } from '../hooks/useCountUp';
import { useAnyVisible } from '../hooks/useAnyVisible';
import { SALES_LANDING, type SalesLandingStat, type SalesLandingPlan } from '../content/salesLanding';
import './SalesLandingPage.css';

const VIDEO_PLACEHOLDER = 'REEMPLAZAR';

function buildWhatsappUrl(number: string, message: string): string {
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * Pinta **lo marcado entre dobles asteriscos** con el color de énfasis.
 *
 * El texto vive en un objeto de configuración que mañana llegará de la base de
 * datos, así que no puede traer JSX. Un marcador dentro de la cadena deja que
 * quien escribe el copy decida qué se resalta sin tocar la maqueta — y sin
 * abrir la puerta a inyectar HTML, porque lo único que se interpreta son los
 * asteriscos.
 */
const Highlight = ({ text }: { text: string }) => (
    <>
        {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
            part.startsWith('**') && part.endsWith('**')
                ? <mark key={i} className="sl-mark">{part.slice(2, -2)}</mark>
                : part,
        )}
    </>
);

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

/**
 * Tarjeta de un grupo.
 *
 * `perks` y `extras` se pintan con el mismo tick: los extras solo cambian de
 * color. Es deliberado — marcar los extras con otro símbolo insinuaría que a
 * la otra tarjeta le faltan, y aquí ninguna carece de nada: cada una suma.
 */
const PlanCard = ({ plan, whatsappNumber }: { plan: SalesLandingPlan; whatsappNumber: string }) => (
    <article className={`sl-plan${plan.featured ? ' sl-plan--featured' : ''}`}>
        <span className="sl-plan__badge">{plan.badge}</span>
        <h3 className="sl-plan__name">{plan.name}</h3>
        <p className="sl-plan__tagline"><Highlight text={plan.tagline} /></p>

        <p className="sl-plan__price">{plan.price}</p>
        <p className="sl-plan__price-note">{plan.priceNote}</p>

        <ul className="sl-plan__perks">
            {plan.perks.map((perk) => (
                <li key={perk}>
                    <span className="sl-plan__tick" aria-hidden="true">✓</span>
                    <span><Highlight text={perk} /></span>
                </li>
            ))}
            {plan.extras.map((extra) => (
                <li key={extra} className="sl-plan__perk--extra">
                    <span className="sl-plan__tick" aria-hidden="true">✓</span>
                    <span><Highlight text={extra} /></span>
                </li>
            ))}
        </ul>

        <a
            href={buildWhatsappUrl(whatsappNumber, plan.whatsappMessage)}
            className="sl-cta sl-cta--plan sl-cta--inline"
            target="_blank"
            rel="noopener noreferrer"
        >
            <span className="sl-cta__icon" aria-hidden="true">💬</span>
            {plan.ctaLabel}
        </a>
    </article>
);

export const SalesLandingPage = () => {
    useScrollReveal();

    const c = SALES_LANDING;
    const whatsappUrl = buildWhatsappUrl(c.whatsappNumber, c.whatsappMessage);

    // La barra fija solo se asoma cuando ningún botón del contenido está a la
    // vista: si no, la visitante ve el mismo botón dos veces a la vez.
    const inlineCtaVisible = useAnyVisible('.sl-cta--inline');

    // Los botones que viven en el contenido llevan además `sl-cta--inline`:
    // es lo que observa useAnyVisible para decidir si esconder la barra fija.
    const INLINE_VARIANTS = ['hero', 'close'];

    const cta = (variant: string, label = c.ctaLabel) => (
        <a
            href={whatsappUrl}
            className={[
                'sl-cta',
                `sl-cta--${variant}`,
                INLINE_VARIANTS.includes(variant) ? 'sl-cta--inline' : '',
            ].join(' ').trim()}
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
                    {[0, 1].map((copy) => (
                        <div className="sl-announce__group" key={copy} aria-hidden={copy === 1}>
                            {[0, 1, 2].map((i) => <span key={i}>{c.announcement}</span>)}
                        </div>
                    ))}
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
                    <p className="sl-hero__sub"><Highlight text={c.subheadline} /></p>

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

            {/* ─── LO QUE GANAS ─────────────────────────────────── */}
            <section className="sl-section reveal">
                <div className="sl-container">
                    <h2 className="sl-section__title">{c.winsTitle}</h2>
                    <p className="sl-section__intro"><Highlight text={c.winsIntro} /></p>
                    <div className="sl-wins">
                        {c.wins.map((w) => (
                            <div className="sl-win" key={w}>
                                <span className="sl-win__tick" aria-hidden="true">✓</span>
                                <p><Highlight text={w} /></p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── LOS 4 PILARES ───────────────────────────────── */}
            <section className="sl-section sl-section--alt reveal">
                <div className="sl-container">
                    <h2 className="sl-section__title">{c.modulesTitle}</h2>
                    <p className="sl-section__intro"><Highlight text={c.modulesIntro} /></p>
                    <div className="sl-modules">
                        {c.modules.map((m) => (
                            <article className="sl-module" key={m.number}>
                                <span className="sl-module__num">{m.number}</span>
                                <h3 className="sl-module__name">{m.name}</h3>
                                <ul className="sl-module__points">
                                    {m.points.map((pt) => <li key={pt}>{pt}</li>)}
                                </ul>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── REQUISITO ───────────────────────────────────── */}
            <section className="sl-section reveal">
                <div className="sl-container sl-container--narrow">
                    <div className="sl-requirement">
                        <span className="sl-requirement__icon" aria-hidden="true">🔑</span>
                        <div>
                            <h2 className="sl-requirement__title">{c.requirementTitle}</h2>
                            <p><Highlight text={c.requirementBody} /></p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── LOS DOS GRUPOS ───────────────────────────────── */}
            <section className="sl-section sl-section--alt reveal">
                <div className="sl-container">
                    <h2 className="sl-section__title">{c.plansTitle}</h2>
                    <p className="sl-section__intro"><Highlight text={c.plansIntro} /></p>

                    <div className="sl-plans">
                        {c.plans.map((plan) => (
                            <PlanCard key={plan.id} plan={plan} whatsappNumber={c.whatsappNumber} />
                        ))}
                    </div>

                    <p className="sl-plans__footer"><Highlight text={c.plansFooter} /></p>

                    <p className="sl-fineprint">{c.finePrint}</p>
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
                <div className="sl-container sl-container--narrow">
                    <h2 className="sl-section__title">Esto es para ti si…</h2>
                    <ul className="sl-list sl-list--yes">
                        {c.forWhom.map((item) => (
                            <li key={item}><Highlight text={item} /></li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* ─── CIERRE ───────────────────────────────────────── */}
            <section className="sl-close reveal">
                <div className="sl-container sl-container--narrow">
                    <p className="sl-scarcity">
                        <span className="sl-scarcity__tag">Cupos limitados</span>
                        <Highlight text={c.scarcityNote} />
                    </p>
                    <h2 className="sl-close__title">{c.closingHeadline}</h2>
                    <p className="sl-close__body"><Highlight text={c.closingBody} /></p>
                    {cta('close')}
                    <p className="sl-cta__hint">{c.ctaHint}</p>
                </div>
            </section>

            <div className={`sl-sticky${inlineCtaVisible ? ' sl-sticky--hidden' : ''}`}>
                {cta('sticky')}
            </div>
        </div>
    );
};
