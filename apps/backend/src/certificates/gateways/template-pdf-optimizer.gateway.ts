/**
 * Aligera el PDF de una plantilla antes de guardarlo sin cambiar lo que se ve.
 * Si no puede optimizarlo, devuelve el original: nunca debe fallar una subida.
 */
export abstract class TemplatePdfOptimizerGateway {
  abstract optimize(pdf: Buffer): Promise<Buffer>;
}
