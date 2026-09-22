/**
 * Contenido de la página de ventas.
 *
 * Vive separado de la maqueta porque el siguiente paso es servirlo desde la BD
 * con una pantalla de administración: cuando llegue ese momento, la página pasa
 * a recibir este mismo objeto desde un gateway y no cambia una sola línea de su
 * JSX. Mientras tanto, editar aquí y desplegar.
 */

export interface SalesLandingBenefit {
    icon: string;
    title: string;
    description: string;
}

export interface SalesLandingTestimonial {
    quote: string;
    author: string;
    detail: string;
}

export interface SalesLandingFaq {
    question: string;
    answer: string;
}

export interface SalesLandingContent {
    whatsappNumber: string;
    whatsappMessage: string;
    youtubeVideoId: string;
    eyebrow: string;
    headline: string;
    headlineAccent: string;
    subheadline: string;
    ctaLabel: string;
    ctaHint: string;
    scarcityNote: string;
    benefits: SalesLandingBenefit[];
    forWhom: string[];
    notForWhom: string[];
    testimonials: SalesLandingTestimonial[];
    faqs: SalesLandingFaq[];
    closingHeadline: string;
    closingBody: string;
}

export const SALES_LANDING: SalesLandingContent = {
    // Formato internacional sin '+', sin espacios ni guiones: lo exige wa.me.
    whatsappNumber: '000000000000',
    whatsappMessage: 'Hola Maria, vi la página del curso y quiero información para inscribirme.',

    // Solo el identificador, no la URL completa.
    youtubeVideoId: 'REEMPLAZAR',

    eyebrow: 'Formación profesional en uñas',
    headline: 'Deja de cobrar barato por un trabajo',
    headlineAccent: 'que ya haces bien',
    subheadline:
        'Una formación completa, con corrección personalizada de tus trabajos y certificado verificable, para que dejes de competir por precio y empieces a cobrar lo que vale tu técnica.',

    ctaLabel: 'Quiero inscribirme',
    ctaHint: 'Te escribe Maria directamente por WhatsApp',
    scarcityNote: 'Cupos limitados: cada alumna recibe corrección personalizada, y eso pone un tope real a cuántas puedo acompañar a la vez.',

    benefits: [
        {
            icon: '🎥',
            title: 'Clases grabadas, a tu ritmo',
            description:
                'Ves cada técnica cuantas veces necesites, desde el celular o la computadora, sin horarios que cumplir.',
        },
        {
            icon: '✍️',
            title: 'Corrección personalizada',
            description:
                'Subes fotos de tu trabajo y recibes una revisión con lo que hay que ajustar. No es un video que compras y quedas sola.',
        },
        {
            icon: '🎓',
            title: 'Certificado verificable',
            description:
                'Al terminar recibes un certificado con código de verificación en línea, que tu clienta puede comprobar.',
        },
        {
            icon: '💬',
            title: 'Acompañamiento real',
            description:
                'Preguntas lo que no entiendes y te responde quien da la clase, no un bot ni un foro abandonado.',
        },
    ],

    forWhom: [
        'Ya haces uñas pero sientes que tu acabado no termina de verse profesional',
        'Cobras menos de lo que quisieras porque no te sientes segura de tu técnica',
        'Aprendiste viendo videos sueltos y te quedaron huecos',
        'Quieres un certificado que respalde lo que ya sabes hacer',
    ],

    notForWhom: [
        'Buscas un curso de fin de semana para "salir certificada" sin practicar',
        'No estás dispuesta a subir tus trabajos para que te los corrijan',
    ],

    // ⚠️ PLACEHOLDER — sustituir por testimonios REALES con permiso de la alumna.
    // No publicar estos textos: son de relleno para ver la maqueta.
    testimonials: [
        {
            quote: '[Testimonio real pendiente — pedirle a la alumna su texto y su permiso]',
            author: 'Nombre de la alumna',
            detail: 'Curso · Ciudad',
        },
        {
            quote: '[Testimonio real pendiente — pedirle a la alumna su texto y su permiso]',
            author: 'Nombre de la alumna',
            detail: 'Curso · Ciudad',
        },
    ],

    faqs: [
        {
            question: '¿Cuánto tiempo tengo acceso?',
            answer:
                'El acceso tiene una duración definida al momento de inscribirte, y te la confirmo por WhatsApp antes de que pagues. Dentro de ese periodo ves las clases las veces que quieras.',
        },
        {
            question: '¿Necesito tener experiencia?',
            answer:
                'La formación asume que ya trabajas o practicas con uñas. Si estás empezando desde cero, escríbeme y te digo con honestidad si te conviene o si es mejor que esperes.',
        },
        {
            question: '¿Cómo funciona la corrección de trabajos?',
            answer:
                'Subes fotos de tu práctica desde tu cuenta y recibes una revisión con lo que hay que ajustar. Por eso los cupos son limitados: corregir bien toma tiempo.',
        },
        {
            question: '¿Cómo pago?',
            answer:
                'Escríbeme por WhatsApp y coordinamos el medio de pago que te quede mejor. Una vez confirmado, te llega tu enlace de acceso personal.',
        },
        {
            question: '¿El certificado sirve?',
            answer:
                'Lleva un código de verificación en línea: cualquiera puede entrar a la web y comprobar que es auténtico y a nombre de quién está emitido.',
        },
    ],

    closingHeadline: 'Tu técnica ya vale. Falta que se note.',
    closingBody:
        'Escríbeme y te cuento sin compromiso si esta formación es para ti. Si veo que no lo es, te lo digo.',
};
