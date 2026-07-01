import { useState } from 'react';

/**
 * FaqSection — Preguntas frecuentes de la landing (acordeón).
 *
 * Pensada para alumnas nuevas en la marca y en el e-learning: tono cálido y
 * cercano, y deja claro que aquí el certificado se gana (exámenes y trabajos
 * reales). Acordeón de una sola respuesta abierta a la vez, accesible por
 * teclado (button + aria-expanded/controls) y con animación suave de altura.
 */
const FAQS: { q: string; a: string }[] = [
    {
        q: '¿Necesito saber algo antes de empezar?',
        a: `Depende del curso, y por eso hay para cada etapa. Tenemos formaciones desde cero, donde no damos nada por sabido y empezamos por lo más básico; y otras más avanzadas, pensadas para quienes ya tienen una base y quieren subir de nivel. Cada curso te dice para quién es, así eliges el que va contigo. Y si empiezas de cero, tranquila: vas paso a paso, a tu ritmo, sin preguntas tontas ni prisa.`,
    },
    {
        q: 'Nunca he estudiado por internet, ¿me va a costar?',
        a: `Si sabes usar WhatsApp o Instagram, sabes usar esto. Entras, abres tu clase y le das play. No hay que instalar nada raro ni ser experta en tecnología: está pensado para que sea fácil desde el primer día.`,
    },
    {
        q: '¿Tengo que conectarme a una hora exacta?',
        a: `Las clases grabadas las ves cuando tú puedas: de madrugada, entre clientas, el domingo… el horario lo pones tú. Algunos cursos además tienen clases en vivo, con su fecha (te avisamos con tiempo). Esas quedan grabadas para que las repases, pero solo mientras dure el curso: al terminarlo, ese acceso se cierra y las retiramos de nuestro lado.`,
    },
    {
        q: '¿Puedo repetir las clases si no me sale a la primera?',
        a: `Todas las veces que necesites mientras el curso esté activo. Eso sí, un curso no es para siempre: tienes un tiempo para completar las clases y las actividades, y cuando ese periodo termina, el acceso se cierra. No es por presionarte, es para que de verdad avances y no lo dejes "para después" eternamente. Nadie aprende de un solo intento, así que repites, practicas y avanzas cuando lo dominas… dentro de tu tiempo.`,
    },
    {
        q: '¿Me gradúo solo por terminar los videos?',
        a: `No, y eso es justo lo que nos hace diferentes. Aquí no se "pasa de pantalla" para tener un papel. Hay exámenes reales y trabajos que se revisan de verdad: tienes que demostrar que sabes hacerlo bien. El certificado no se regala, se gana.`,
    },
    {
        q: '¿Y si hago el trabajo y no me queda bien?',
        a: `Subes una foto de tu práctica y la educadora la revisa personalmente. Si algo se puede mejorar, te dice exactamente qué y cómo, y lo repites hasta que quede bien. No te aprueba por cumplir: te acompaña hasta que de verdad te sale. Ese es el punto.`,
    },
    {
        q: '¿El certificado sirve de algo?',
        a: `Sí, y vale porque se gana. Recibes un documento profesional con tu nombre y un código QR único. Al escanearlo, te lleva a esta misma página, donde cualquiera —una clienta, un empleador— puede comprobar al instante que el certificado es oficial y emitido por nosotros. No es un adorno: es respaldo real de lo que sabes hacer.`,
    },
    {
        q: '¿Cómo me inscribo? ¿Es complicado?',
        a: `Creas tu cuenta gratis con tu nombre y tu correo, nada más. Desde ahí eliges tu formación y empiezas. Si te trabas en algún paso, escríbenos y te guiamos.`,
    },
    {
        q: 'Se me olvida la contraseña o me pierdo, ¿pierdo todo?',
        a: `Nunca. Si olvidas tu contraseña, con un correo creas una nueva y tus cursos y certificados siguen intactos, esperándote. Y si te sientes perdida, siempre puedes escribirnos por WhatsApp o Instagram.`,
    },
];

export function FaqSection() {
    // Índice de la respuesta abierta (una a la vez); null = todas cerradas.
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="home-faq reveal">
            <div className="container">
                <p className="section-eyebrow">Preguntas frecuentes</p>
                <p className="home-faq__subtitle">
                    ¿Tienes dudas sobre algún curso o problemas para comenzar tu formación?
                    Estamos aquí para orientarte.
                </p>

                <div className="home-faq__list">
                    {FAQS.map((item, i) => {
                        const isOpen = openIndex === i;
                        return (
                            <div key={i} className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}>
                                <h3 className="faq-item__q">
                                    <button
                                        type="button"
                                        className="faq-item__trigger"
                                        aria-expanded={isOpen}
                                        aria-controls={`faq-panel-${i}`}
                                        id={`faq-trigger-${i}`}
                                        onClick={() => setOpenIndex(isOpen ? null : i)}
                                    >
                                        <span>{item.q}</span>
                                        <svg
                                            className="faq-item__icon"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden="true"
                                        >
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </button>
                                </h3>
                                {/* grid-template-rows 0fr→1fr anima la altura suavemente */}
                                <div
                                    className="faq-item__panel"
                                    id={`faq-panel-${i}`}
                                    role="region"
                                    aria-labelledby={`faq-trigger-${i}`}
                                >
                                    <div className="faq-item__answer">
                                        <p>{item.a}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
