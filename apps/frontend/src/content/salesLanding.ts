/**
 * Contenido de la página de ventas del Máster Educador Internacional.
 *
 * Vive separado de la maqueta porque el siguiente paso es servirlo desde la BD
 * con una pantalla de administración: cuando llegue ese momento, la página pasa
 * a recibir este mismo objeto desde un gateway y no cambia una sola línea de su
 * JSX. Mientras tanto, editar aquí y desplegar.
 *
 * En los textos, **lo que va entre dobles asteriscos** se pinta resaltado. Lo
 * interpreta el componente Highlight de la página.
 *
 * FUENTE: "Master Educador Online (Grabado con mentorias).pdf".
 *
 * ⚠️ El dossier insiste en que esto es una FORMACIÓN GRUPAL, no una mentoría
 * privada, y el curso NO es reembolsable. Prometer aquí una cercanía que el
 * programa no da deja a la alumna atrapada y a Maria expuesta. No subir el tono
 * del acompañamiento por encima de lo que dice el dossier.
 */

export interface SalesLandingStat {
    /** Solo la parte numérica: la anima el contador. */
    value: number;
    prefix: string;
    suffix: string;
    label: string;
}

export interface SalesLandingModule {
    number: string;
    name: string;
    points: string[];
}

/**
 * Un grupo del curso.
 *
 * REGLA DE REDACCIÓN, y es la que sostiene toda la sección: `perks` enumera
 * SIEMPRE lo que ese grupo SÍ incluye. Nunca lo que le falta respecto al otro.
 * Una lista con cruces convierte al grupo barato en el premio de consolación, y
 * quien siente que se conformó es una alumna peor: exige más y recomienda menos.
 * Cada grupo gana en algo distinto, y `tagline` dice en qué.
 */
export interface SalesLandingPlan {
    id: string;
    name: string;
    badge: string;
    /** En qué gana ESTE grupo. Todos ganan en algo. */
    tagline: string;
    featured: boolean;
    price: string;
    priceNote: string;
    perks: string[];
    /** Lo que este grupo suma sobre el otro, en positivo. */
    extras: string[];
    ctaLabel: string;
    whatsappMessage: string;
}

export interface SalesLandingTestimonial {
    quote: string;
    author: string;
    detail: string;
    result: string;
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

    winsTitle: string;
    winsIntro: string;
    wins: string[];

    modulesTitle: string;
    modulesIntro: string;
    modules: SalesLandingModule[];

    requirementTitle: string;
    requirementBody: string;

    plansTitle: string;
    plansIntro: string;
    plans: SalesLandingPlan[];
    plansFooter: string;
    finePrint: string;

    forWhom: string[];
    testimonials: SalesLandingTestimonial[];

    scarcityNote: string;
    closingHeadline: string;
    closingBody: string;
}

export const SALES_LANDING: SalesLandingContent = {
    announcement: '✨ INSCRIPCIONES ABIERTAS · 6 SEMANAS · 100 % ONLINE · CUPOS LIMITADOS',

    // Formato internacional sin '+', sin espacios ni guiones: lo exige wa.me.
    whatsappNumber: '000000000000',
    whatsappMessage: 'Hola Maria, vi la página del Máster Educador Internacional y quiero información para inscribirme.',

    // Solo el identificador, no la URL completa.
    youtubeVideoId: 'REEMPLAZAR',

    eyebrow: 'Master Educador Elite',
    headline: 'No te enseño a hacer uñas.',
    headlineAccent: 'Te enseño a enseñar.',
    subheadline:
        'Dominar la técnica te dio experiencia. Convertirla en **un método que otra persona pueda comprender, ejecutar y replicar** es lo que te convierte en educadora. Seis semanas para dar ese salto.',

    ctaLabel: 'Quiero mi cupo',
    ctaHint: 'Te responde Maria directamente · Sin compromiso',

    // Cifras reales del dossier. Nada inventado.
    stats: [
        { value: 6, prefix: '', suffix: ' semanas', label: 'De formación' },
        { value: 4, prefix: '', suffix: ' pilares', label: 'Contenido académico' },
        { value: 2, prefix: '', suffix: '', label: 'Modalidades' },
    ],

    marqueeWords: [
        'Andragogía',
        'Oratoria y liderazgo',
        'Manejo de grupos',
        'Método de los 4 Pasos',
        'Diagnóstico Causa–Efecto',
        'Pricing estratégico',
        'Aula digital',
        'Marketing académico',
    ],

    winsTitle: 'Tu experiencia todavía no es una metodología',
    winsIntro:
        'Esto no es un curso técnico centrado en estructuras. Es una **formación pedagógica de nivel superior** para quien ya domina la técnica y ahora quiere dominar el arte de transmitirla.',
    wins: [
        'Un **método propio, replicable**, que otra persona puede seguir y ejecutar',
        'Criterio para **diagnosticar el error de una alumna sin tocarle la mano**',
        '**Oratoria y liderazgo** para sostener un grupo y a las alumnas difíciles',
        'Saber **cuánto cobrar por tu tiempo** y cómo llenar tus propias formaciones',
        'Manuales y aula digital **de alta gama**, diseñados con criterio profesional',
        'Una **certificación profesional** que diferencia tu academia en el mercado',
    ],

    modulesTitle: 'Los 4 pilares',
    modulesIntro:
        'Enseñar, comunicar, diseñar y **vender tu propia formación** con criterio profesional.',

    // ⚠️ REVISAR CON MARIA: el dossier agrupa las viñetas por página, no por
    // módulo, así que este reparto es una interpretación razonable — no un dato
    // literal. Confirmar antes de publicar.
    modules: [
        {
            number: '01',
            name: 'La Identidad de la Mentora',
            points: [
                'Andragogía: cómo enseñarle a personas adultas',
                'Oratoria y liderazgo frente a un grupo',
                'Manejo de grupos y de alumnas difíciles',
            ],
        },
        {
            number: '02',
            name: 'Ingeniería de la Instrucción',
            points: [
                'Método de los 4 Pasos para demostraciones perfectas',
                'Diagnóstico “Causa–Efecto”: detectar errores sin tocar la mano',
                'Planificación curricular y cronogramas de clase',
            ],
        },
        {
            number: '03',
            name: 'Arquitectura Visual y Aula Digital',
            points: [
                'Creación de contenido pedagógico con inteligencia artificial',
                'Diseño de manuales de alta gama para tus alumnas',
            ],
        },
        {
            number: '04',
            name: 'Business & Marketing Académico',
            points: [
                'Pricing estratégico: cuánto cobrar por tu tiempo',
                'Guiones de venta para llenar tus cursos',
                'Legalidad, certificados y términos de uso',
            ],
        },
    ],

    requirementTitle: 'Requisito de ingreso',
    requirementBody:
        'Debes **dominar previamente al menos una técnica** del área de uñas que quieras enseñar. Uña natural, nivelación, reconstrucción, estructuras, acrílico, gel, dual system, nail art… la que sea. Este Máster **no sustituye una formación técnica inicial**: aquí aprendes a enseñar lo que ya sabes hacer.',

    plansTitle: 'Elige cómo quieres cursarlo',
    plansIntro:
        'Mismo programa, mismas evaluaciones, misma certificación. **Lo que cambia es el acompañamiento** — y cada grupo gana en algo distinto. En el video te cuento el detalle.',

    plans: [
        {
            id: 'grabado',
            name: 'Grupo grabado',
            badge: 'A tu ritmo',
            tagline: 'Gana en **libertad**: tú decides cuándo, dónde y a qué ritmo.',
            featured: false,
            price: 'USD 100',
            priceNote: 'USD 50 de inscripción + USD 50 antes del inicio',
            perks: [
                'Los 4 pilares y el Laboratorio de criterio técnico',
                'Clases, materiales y **evaluaciones corregidas**',
                'Certificación verificable al aprobar',
            ],
            extras: [
                'Clases **pregrabadas en la plataforma**, disponibles según la programación',
                '**2 mentorías grupales en vivo** para profundizar y resolver dudas',
                'Avanzas cuando puedes, **sin horarios que cumplir**',
                'Repites cada clase **las veces que necesites**',
            ],
            ctaLabel: 'Quiero el grupo grabado',
            whatsappMessage: 'Hola Maria, quiero información del MÁSTER EDUCADOR en el GRUPO GRABADO para inscribirme.',
        },
        {
            id: 'vivo',
            name: 'Grupo en vivo',
            badge: 'Más cercanía',
            // ⚠️ PLACEHOLDER — falta el dossier del grupo en vivo. Confirmar
            // cada punto y el precio con Maria antes de publicar.
            tagline: 'Gana en **cercanía**: Maria contigo, en directo.',
            featured: true,
            price: 'USD 000',
            priceNote: 'Pago único · Cupos muy limitados',
            perks: [
                'Los 4 pilares y el Laboratorio de criterio técnico',
                'Clases, materiales y **evaluaciones corregidas**',
                'Certificación verificable al aprobar',
            ],
            extras: [
                '**Clases en directo** con Maria: preguntas en el momento',
                '**Acompañamiento por WhatsApp, día a día**',
                '**Grupo cerrado y reducido**: más tiempo para cada participante',
                'Cada clase queda grabada **30 días** desde su emisión',
            ],
            ctaLabel: 'Quiero el grupo en vivo',
            whatsappMessage: 'Hola Maria, quiero información del MÁSTER EDUCADOR en el GRUPO EN VIVO para inscribirme.',
        },
    ],
    plansFooter:
        '¿No sabes cuál te conviene? **Escríbeme y lo vemos juntas.** Te digo con honestidad cuál encaja con tu tiempo y tu objetivo.',

    finePrint:
        'La inscripción se descuenta del valor total. La inscripción y el valor del curso no son reembolsables, y el curso no es transferible. En casos excepcionales y comprobables —por ejemplo, razones médicas documentadas— el monto puede reagendarse para una futura edición. El acceso a las clases está condicionado al pago total.',

    forWhom: [
        'Eres **manicurista y dominas una técnica** que quieres enseñar de forma profesional',
        'Tienes **una academia** y quieres profesionalizar tu forma de enseñar',
        'Quieres **diferenciar tu marca** con una metodología propia y de prestigio',
        'Ya das clases, pero **improvisas** y quieres un método que no dependa de la inspiración',
    ],

    // ⚠️ PLACEHOLDER — testimonios REALES, con permiso de la alumna.
    testimonials: [
        {
            quote: '[Testimonio real pendiente — pedirle a la alumna su texto y su permiso]',
            author: 'Nombre de la alumna',
            detail: 'Edición · Ciudad',
            result: 'Resultado concreto',
        },
        {
            quote: '[Testimonio real pendiente — pedirle a la alumna su texto y su permiso]',
            author: 'Nombre de la alumna',
            detail: 'Edición · Ciudad',
            result: 'Resultado concreto',
        },
        {
            quote: '[Testimonio real pendiente — pedirle a la alumna su texto y su permiso]',
            author: 'Nombre de la alumna',
            detail: 'Edición · Ciudad',
            result: 'Resultado concreto',
        },
    ],

    scarcityNote:
        'Los cupos son limitados: cada edición lleva **evaluación individual** de cada participante, y eso **pone un tope real** a cuántas educadoras puedo acompañar a la vez. **Escríbeme para saber la próxima fecha disponible.**',

    closingHeadline: 'Tu talento te hizo artista, tu pedagogía te hará leyenda.',
    closingBody:
        'Escríbeme y vemos juntas cuál de los dos grupos te conviene. **Sin compromiso.**',
};
