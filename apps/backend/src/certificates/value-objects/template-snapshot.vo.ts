/**
 * TemplateSnapshot — Value Object que congela los metadatos de una plantilla
 * en el momento exacto de emisión de un certificado.
 *
 * ¿Por qué un snapshot y no leer la plantilla viva?
 *
 *   Un certificado, una vez emitido, es un documento INMUTABLE. Si mañana
 *   editamos la plantilla "Manicure Básico" y la renombramos a "Manicure
 *   Profesional", los certificados ya entregados a alumnos NO deben empezar
 *   a decir que pertenecen a un curso con otro nombre — ese es el dato que
 *   recibió el alumno y debe permanecer tal cual.
 *
 *   El PDF rasterizado en disco ya está congelado de facto (es un archivo
 *   binario). Pero los metadatos que mostramos en la UI alrededor del PDF
 *   (nombre del curso, abreviatura, formato de papel) se leían hasta hoy
 *   desde la plantilla viva — y eso era una mentira en cuanto editáramos.
 *
 *   Este VO se persiste como jsonb en la fila de Certificate y se popula
 *   una sola vez durante GenerateCertificateBatchUseCase. Nunca se actualiza.
 *
 * ¿Por qué solo 3 campos y no más?
 *
 *   Solo guardamos lo que el usuario ve a través de la UI:
 *     - name               → "Manicure Básico" (mostrado en listados/detalles)
 *     - courseAbbreviation → "MB" (forma parte del certificateNumber)
 *     - paperFormat        → "A4 Horizontal" (útil para reimpresión)
 *
 *   NO guardamos nameStyle/qrStyle/dateStyle porque ya están "quemados"
 *   en píxeles dentro del PDF generado. Guardarlos otra vez sería
 *   redundancia sin propósito.
 *
 *   NO guardamos filePath de la plantilla porque el certificado tiene
 *   su PROPIO filePath apuntando al PDF rasterizado final.
 *
 * Es una CLASE (no interface) por la misma razón que NameStyle/QrStyle/DateStyle:
 * TypeORM + emitDecoratorMetadata necesita un tipo que exista en runtime.
 */
export class TemplateSnapshot {
  name: string;
  courseAbbreviation: string;
  paperFormat: string;
}
