import { PayloadTooLargeException } from '@nestjs/common';
import { CERTIFICATE_TEMPLATE_MAX_BYTES } from '@maris-nails/shared';

const EXPORT_HINT =
  'Expórtala de nuevo más liviana: en Canva, Compartir → Descargar → «PDF estándar», ' +
  'o «PDF para imprimir» con «Comprimir archivo» marcado; en Photoshop, guarda el PDF ' +
  'con calidad de imagen JPEG alta en vez de máxima. Un A4 suele quedar en 300–800 KB.';

/** Tamaño legible para la admin: "4,6 MB", "912 KB". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toLocaleString('es-CL', { maximumFractionDigits: 1 })} MB`;
  }
  return `${Math.ceil(bytes / 1024)} KB`;
}

/**
 * Regla de peso de una plantilla. Se mide lo que se guardaría (ya optimizado),
 * no lo subido: así la optimización juega a favor de la admin.
 */
export function assertTemplateWithinSizeLimit(
  uploadedBytes: number,
  storedBytes: number,
): void {
  if (storedBytes <= CERTIFICATE_TEMPLATE_MAX_BYTES) return;

  const uploaded = formatBytes(uploadedBytes);
  const stored = formatBytes(storedBytes);
  // Solo si la optimización se nota en la cifra que ve la admin.
  const optimized =
    stored !== uploaded ? ` (${stored} después de optimizarla)` : '';
  throw new PayloadTooLargeException(
    `La plantilla pesa ${uploaded}${optimized} y el máximo es ` +
      `${formatBytes(CERTIFICATE_TEMPLATE_MAX_BYTES)}. ${EXPORT_HINT}`,
  );
}
