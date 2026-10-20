/** WhatsApp de la academia (la profesora), en formato internacional sin '+'. */
export const ACADEMY_WHATSAPP = '56946622112';

/**
 * Construye el enlace de WhatsApp según la forma del destino.
 *
 * El enlace corto de WhatsApp Business (wa.me/message/XXXX) IGNORA el parámetro
 * `text`: el saludo lo fija el perfil de la empresa. Se devuelve tal cual, y se
 * pierde el prellenado. Con un número, el mensaje sí llega prellenado.
 */
export function buildWhatsappUrl(target: string, message: string): string {
    if (target.includes('wa.me/message/')) return target;

    const number = target.replace(/\D/g, '');
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Mientras no haya pagos en línea, inscribirse y renovar se coordinan por WhatsApp. */
export const enrollWhatsappUrl = (courseTitle: string): string =>
    buildWhatsappUrl(ACADEMY_WHATSAPP, `Hola Maria, quiero inscribirme en el curso "${courseTitle}".`);

/** Para quien aún no tiene cursos y el catálogo sigue oculto. */
export const coursesInfoWhatsappUrl = (): string =>
    buildWhatsappUrl(ACADEMY_WHATSAPP, 'Hola Maria, quiero información sobre los cursos.');

export const renewWhatsappUrl = (courseTitle: string): string =>
    buildWhatsappUrl(ACADEMY_WHATSAPP, `Hola Maria, quiero renovar mi acceso al curso "${courseTitle}".`);
