/**
 * pdf-units — Conversiones entre unidades del mundo PDF.
 *
 * Un "punto PDF" (pt) = 1/72 de pulgada. Es la unidad nativa del formato PDF
 * y la que usa nuestro backend para guardar posiciones, dimensiones y tamaños.
 *
 * Necesitamos convertir a:
 *   - Milímetros: para mostrar al admin "este PDF mide 210×297 mm" (lenguaje físico).
 *   - Píxeles a 300 DPI: para mostrar al admin la calidad de impresión equivalente
 *     ("297×420 mm = 3508×4961 px @ 300 DPI"), que es el estándar para imprenta.
 *
 * 300 DPI = 300 puntos por pulgada (Dots Per Inch). Es la resolución mínima
 * recomendada para impresión profesional (folletos, certificados, libros).
 * Por debajo de eso (ej. 72 DPI = pantalla web) los detalles se ven pixelados.
 */

export const ptsToMm = (pts: number): number => Math.round((pts * 25.4) / 72);
export const ptsToPx = (pts: number): number => Math.round((pts * 300) / 72);

/**
 * Formatos de papel soportados por el sistema, con sus dimensiones nominales
 * en puntos PDF. La orientación está implícita en el nombre (Vertical/Horizontal),
 * lo cual evita ambigüedad al validar el PDF subido.
 */
export interface PaperFormat {
    value: string;
    label: string;
    wPts: number;
    hPts: number;
}

export const PAPER_FORMATS: PaperFormat[] = [
    { value: 'A4 Vertical',    label: 'Vertical',   wPts: 595,  hPts: 842  },
    { value: 'A4 Horizontal',  label: 'Horizontal', wPts: 842,  hPts: 595  },
    { value: 'A3 Vertical',    label: 'Vertical',   wPts: 842,  hPts: 1191 },
    { value: 'A3 Horizontal',  label: 'Horizontal', wPts: 1191, hPts: 842  },
];

/** Tolerancia en puntos PDF para considerar dos formatos iguales (PDFs reales tienen pequeñas variaciones). */
export const FORMAT_TOLERANCE_PTS = 10;

export const formatLabel = (fmt: PaperFormat): string =>
    `${fmt.label} — ${ptsToMm(fmt.wPts)}×${ptsToMm(fmt.hPts)} mm (${ptsToPx(fmt.wPts)}×${ptsToPx(fmt.hPts)} px @ 300 DPI)`;
