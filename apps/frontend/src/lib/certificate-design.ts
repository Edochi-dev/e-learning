/**
 * Geometría del diseñador de certificados, en puntos PDF (la unidad que se
 * guarda y que usa el backend al dibujar). La pantalla se deriva de aquí con
 * un único factor px/pt; nunca al revés.
 *
 * El ancla X de un texto es su borde izquierdo ('left') o su centro
 * ('center'): así lo interpreta el generador del backend.
 */
export type Align = 'left' | 'center';

export interface Point {
    x: number;
    y: number;
}

/** Borde izquierdo del texto a partir de su ancla. */
export const leftEdge = (anchorX: number, width: number, align: Align): number =>
    align === 'center' ? anchorX - width / 2 : anchorX;

/** Ancla a partir del borde izquierdo (lo que deja un arrastre). */
export const anchorFromLeft = (left: number, width: number, align: Align): number =>
    align === 'center' ? left + width / 2 : left;

/** Nueva ancla al cambiar de alineación sin que el texto se mueva en la hoja. */
export const realign = (anchorX: number, width: number, from: Align, to: Align): number =>
    anchorFromLeft(leftEdge(anchorX, width, from), width, to);

/**
 * Factor px/pt para que la hoja quepa entera en el espacio disponible
 * (el "ajustar a pantalla"), multiplicado por el zoom.
 */
export const fitScale = (
    available: { width: number; height: number },
    page: { width: number; height: number },
    zoom = 1,
): number => {
    if (available.width <= 0 || page.width <= 0) return 0;
    const byWidth = available.width / page.width;
    const byHeight = available.height > 0 ? available.height / page.height : byWidth;
    return Math.min(byWidth, byHeight) * zoom;
};

/** Mantiene una caja de ancho×alto dentro de la hoja (su esquina superior izquierda). */
export const clampBox = (
    left: number,
    top: number,
    size: { width: number; height: number },
    page: { width: number; height: number },
): Point => ({
    x: Math.min(Math.max(0, left), Math.max(0, page.width - size.width)),
    y: Math.min(Math.max(0, top), Math.max(0, page.height - size.height)),
});

/** El backend solo acepta #RRGGBB. */
export const isHexColor = (value: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(value);
