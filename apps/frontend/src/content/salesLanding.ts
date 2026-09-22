/**
 * Contenido de la página de ventas.
 *
 * Vive separado de la maqueta porque el siguiente paso es servirlo desde la BD
 * con una pantalla de administración: cuando llegue ese momento, la página pasa
 * a recibir este mismo objeto desde un gateway y no cambia una sola línea de su
 * JSX. Mientras tanto, editar aquí y desplegar.
 *
 * ⚠️ Los campos marcados como PLACEHOLDER afirman un HECHO comprobable (cifras,
 * precios, garantías). Publicarlos sin sustituirlos por datos reales es
 * publicidad engañosa, y quien responde por ella es Maria.
 */

export interface SalesLandingStat {
    /** Solo la parte numérica: la anima el contador. */
    value: number;
    prefix: string;
    suffix: string;
    label: string;
}

export interface SalesLandingBenefit {
    icon: string;
    title: string;
    description: string;
}

export interface SalesLandingValueItem {
    item: string;
    worth: string;
}

export interface SalesLandingBonus {
    icon: string;
    title: string;
    description: string;
    worth: string;
}

export interface SalesLandingTransform {
    before: string;
    after: string;
}

export interface SalesLandingTestimonial {
    quote: string;
    author: string;
    detail: string;
    result: string;
}

export interface SalesLandingFaq {
    question: string;
    answer: string;
}

export interface SalesLandingContent {
    announcement: string;
    whatsappNumber: string;
    whatsappMessage: string;
    youtubeVideoId: string;

    eyebrow: string;
    headline: string;
    headlineAccent: string;
    subheadline: string;
    ctaLabel: string;
    ctaHint: string;

    stats: SalesLandingStat[];
    marqueeWords: string[];

    painTitle: string;
    painPoints: string[];
    painTurn: string;

    transforms: SalesLandingTransform[];
    benefits: SalesLandingBenefit[];

    valueStack: SalesLandingValueItem[];
    totalWorth: string;
    price: string;
    priceNote: string;

    bonuses: SalesLandingBonus[];
    guaranteeTitle: string;
    guaranteeBody: string;

    forWhom: string[];
    notForWhom: string[];
    testimonials: SalesLandingTestimonial[];
    faqs: SalesLandingFaq[];

    scarcityNote: string;
    closingHeadline: string;
    closingBody: string;

    exitTitle: string;
    exitBody: string;
    exitCtaLabel: string;
}

export const SALES_LANDING: SalesLandingContent = {
    announcement: '🔥 Inscripciones abiertas · Cupos limitados por corrección personalizada',

    // Formato internacional sin '+', sin espacios ni guiones: lo exige wa.me.
    whatsappNumber: '000000000000',
    whatsappMessage: 'Hola Maria, vi la página del curso y quiero información para inscribirme.',

    // Solo el identificador, no la URL completa.
    youtubeVideoId: 'REEMPLAZAR',

    eyebrow: '✨ Formación profesional en uñas',
    headline: 'Deja de cobrar barato por un trabajo',
    headlineAccent: 'que ya haces bien',
    subheadline:
        'Formación completa, corrección personalizada de TUS trabajos y certificado verificable. Para que dejes de competir por precio y empieces a cobrar lo que vale tu técnica.',

    ctaLabel: 'Quiero mi cupo ahora',
    ctaHint: 'Te responde Maria directamente · Sin compromiso',

    // ⚠️ PLACEHOLDER — cifras reales de Maria antes de publicar.
    stats: [
        { value: 0, prefix: '+', suffix: '', label: 'Alumnas formadas' },
        { value: 0, prefix: '', suffix: '%', label: 'Terminan el curso' },
        { value: 0, prefix: '', suffix: ' años', label: 'Enseñando' },
    ],

    marqueeWords: [
        'Acrílico esculpido',
        'Nail art avanzado',
        'Gel & semipermanente',
        'Corrección 1 a 1',
        'Certificado verificable',
        'Clases grabadas',
    ],

    painTitle: '¿Te suena alguna de estas?',
    painPoints: [
        'Haces uñas bonitas, pero cuando ves el trabajo de otra sientes que al tuyo "le falta algo" y no sabes qué.',
        'Cobras menos de lo que quisieras porque, en el fondo, no te sientes segura de tu acabado.',
        'Aprendiste con videos sueltos de internet y te quedaron huecos que nadie te corrigió nunca.',
        'Tu clienta te pide un diseño y le dices que no, no porque no puedas, sino porque no te atreves.',
        'Llevas años haciendo uñas y no tienes ni un papel que lo respalde.',
    ],
    painTurn: 'Nada de eso se arregla viendo más videos. Se arregla con alguien que mire TU trabajo y te diga exactamente qué cambiar.',

    transforms: [
        { before: 'Copias diseños sin entender por qué funcionan', after: 'Entiendes la técnica y creas los tuyos' },
        { before: 'Tu acabado "casi" queda profesional', after: 'Tu acabado se defiende solo en una foto' },
        { before: 'Compites bajando el precio', after: 'Tu clienta paga lo que pides y vuelve' },
        { before: 'Nadie respalda lo que sabes hacer', after: 'Tienes un certificado que se verifica en línea' },
    ],

    benefits: [
        {
            icon: '🎥',
            title: 'Clases grabadas, a tu ritmo',
            description: 'Ves cada técnica las veces que necesites, desde el celular, sin horarios que cumplir.',
        },
        {
            icon: '✍️',
            title: 'Corrección personalizada',
            description: 'Subes fotos de TU trabajo y recibes una revisión con lo que hay que ajustar. Esto es lo que no te da ningún video de YouTube.',
        },
        {
            icon: '🎓',
            title: 'Certificado verificable',
            description: 'Con código de verificación en línea. Tu clienta entra a la web y comprueba que es auténtico.',
        },
        {
            icon: '💬',
            title: 'Te responde quien enseña',
            description: 'Preguntas lo que no entiendes y te contesta Maria. Ni un bot, ni un foro abandonado.',
        },
    ],

    // ⚠️ PLACEHOLDER — los "valor" deben ser lo que Maria cobraría de verdad
    // por cada cosa suelta. Inventar cifras para inflar el total es engañoso.
    valueStack: [
        { item: 'Formación completa en video', worth: '$000' },
        { item: 'Corrección personalizada de tus trabajos', worth: '$000' },
        { item: 'Certificado verificable', worth: '$000' },
        { item: 'Acompañamiento directo por WhatsApp', worth: '$000' },
    ],
    totalWorth: '$000',
    price: '$000',
    priceNote: 'Pago único · Sin mensualidades',

    // ⚠️ PLACEHOLDER — bonos reales que Maria vaya a entregar de verdad.
    bonuses: [
        {
            icon: '📋',
            title: 'Guía de precios',
            description: 'Cómo calcular cuánto cobrar sin regalar tu trabajo ni espantar a la clienta.',
            worth: '$000',
        },
        {
            icon: '📸',
            title: 'Mini clase de fotos',
            description: 'Cómo fotografiar tus uñas para que se vean como lo que son en Instagram.',
            worth: '$000',
        },
    ],

    // ⚠️ PLACEHOLDER — no publicar una garantía que no se vaya a cumplir.
    guaranteeTitle: 'Garantía de satisfacción',
    guaranteeBody:
        '[Definir con Maria: plazo y condiciones reales. Si no va a haber garantía, borrar esta sección entera en vez de dejar una promesa vaga.]',

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

    // ⚠️ PLACEHOLDER — testimonios REALES, con permiso de la alumna.
    testimonials: [
        {
            quote: '[Testimonio real pendiente — pedirle a la alumna su texto y su permiso]',
            author: 'Nombre de la alumna',
            detail: 'Curso · Ciudad',
            result: 'Resultado concreto',
        },
        {
            quote: '[Testimonio real pendiente — pedirle a la alumna su texto y su permiso]',
            author: 'Nombre de la alumna',
            detail: 'Curso · Ciudad',
            result: 'Resultado concreto',
        },
        {
            quote: '[Testimonio real pendiente — pedirle a la alumna su texto y su permiso]',
            author: 'Nombre de la alumna',
            detail: 'Curso · Ciudad',
            result: 'Resultado concreto',
        },
    ],

    faqs: [
        {
            question: '¿Cuánto tiempo tengo acceso?',
            answer: 'El acceso tiene una duración definida al momento de inscribirte, y te la confirmo por WhatsApp antes de que pagues. Dentro de ese periodo ves las clases las veces que quieras.',
        },
        {
            question: '¿Necesito tener experiencia?',
            answer: 'La formación asume que ya trabajas o practicas con uñas. Si estás empezando desde cero, escríbeme y te digo con honestidad si te conviene o si es mejor que esperes.',
        },
        {
            question: '¿Cómo funciona la corrección de trabajos?',
            answer: 'Subes fotos de tu práctica desde tu cuenta y recibes una revisión con lo que hay que ajustar. Por eso los cupos son limitados: corregir bien toma tiempo.',
        },
        {
            question: '¿Cómo pago?',
            answer: 'Escríbeme por WhatsApp y coordinamos el medio de pago que te quede mejor. Una vez confirmado, te llega tu enlace de acceso personal.',
        },
        {
            question: '¿El certificado sirve?',
            answer: 'Lleva un código de verificación en línea: cualquiera puede entrar a la web y comprobar que es auténtico y a nombre de quién está emitido.',
        },
        {
            question: '¿Y si no tengo tiempo ahora?',
            answer: 'Las clases quedan grabadas y las ves a tu ritmo. Lo que sí tiene tope son los cupos, porque la corrección personalizada la hago yo.',
        },
    ],

    scarcityNote: 'Los cupos son limitados de verdad: cada alumna recibe corrección personalizada de sus trabajos, y eso pone un tope real a cuántas puedo acompañar a la vez.',

    closingHeadline: 'Tu técnica ya vale. Falta que se note.',
    closingBody: 'Escríbeme y te digo sin compromiso si esta formación es para ti. Si veo que no lo es, te lo digo.',

    exitTitle: '¿Te vas sin preguntar?',
    exitBody: 'Escríbeme y te digo en dos minutos si esta formación te sirve. Preguntar no cuesta nada y no te compromete a nada.',
    exitCtaLabel: 'Va, pregunto',
};
