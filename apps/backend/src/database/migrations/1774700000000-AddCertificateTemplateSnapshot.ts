import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddCertificateTemplateSnapshot
 *
 * Añade `templateSnapshot` (jsonb NOT NULL) a la tabla `certificates`.
 * Este snapshot congela los metadatos de la plantilla (name, courseAbbreviation,
 * paperFormat) al momento de emisión, garantizando que un certificado ya emitido
 * NUNCA cambia su identidad cuando la plantilla viva se edita o se borra.
 *
 * SAFETY:
 *   - Esta migración SOLO añade una columna nueva y la rellena.
 *   - NO toca filePath, certificateNumber, recipientName, issuedAt ni templateId
 *     de filas existentes.
 *   - NO toca el filesystem (los PDF rasterizados en public/certificates/generated/
 *     siguen intactos byte por byte).
 *   - Toda la operación corre en una transacción (default de TypeORM): si el
 *     SET NOT NULL final falla, el ADD COLUMN se revierte automáticamente.
 *
 * Estrategia de backfill (defensa en profundidad):
 *   1. ADD COLUMN nullable temporalmente.
 *   2. UPDATE con LEFT JOIN a certificate_templates para cada cert existente.
 *      - Si la plantilla viva existe: copiamos sus metadatos actuales.
 *      - Si la plantilla fue borrada (templateId NULL o sin match):
 *          * name → '(plantilla eliminada)'
 *          * courseAbbreviation → prefijo extraído de certificateNumber
 *            (ej. 'MR-00042' → 'MR')
 *          * paperFormat → 'A4 Vertical' (default seguro)
 *      Hoy NO hay huérfanos en prod (verificado con el admin), pero el LEFT JOIN
 *      garantiza que si se cuela una fila huérfana entre la verificación y el
 *      deploy, la migración no revienta.
 *   3. ALTER COLUMN SET NOT NULL — a partir de aquí el invariante es duro.
 *
 * Nota: el `eager: true` que tenía la relación `template` se elimina en este
 * mismo commit a nivel de entidad (no requiere SQL). El cambio de
 * `onDelete` a SET NULL tampoco requiere SQL porque la relación ya era
 * efectivamente nullable a nivel de aplicación (unlinkAllFromTemplate).
 */
export class AddCertificateTemplateSnapshot1774700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Añadir la columna como nullable temporalmente para permitir backfill
    await queryRunner.query(`
      ALTER TABLE certificates
        ADD COLUMN "templateSnapshot" jsonb
    `);

    // 2. Backfill defensivo via LEFT JOIN
    //    Hoy no hay huérfanos, pero el COALESCE protege ante cualquier
    //    fila que se cuele con templateId NULL o referencia rota.
    await queryRunner.query(`
      UPDATE certificates AS c
      SET "templateSnapshot" = jsonb_build_object(
        'name',               COALESCE(t."name", '(plantilla eliminada)'),
        'courseAbbreviation', COALESCE(t."courseAbbreviation", split_part(c."certificateNumber", '-', 1)),
        'paperFormat',        COALESCE(t."paperFormat", 'A4 Vertical')
      )
      FROM certificates c2
      LEFT JOIN certificate_templates t ON t."id" = c2."templateId"
      WHERE c."id" = c2."id"
    `);

    // 3. Endurecer la columna: NOT NULL
    await queryRunner.query(`
      ALTER TABLE certificates
        ALTER COLUMN "templateSnapshot" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reversión simétrica: solo dropea la columna añadida.
    // No restaura nada del estado anterior porque no había estado anterior:
    // antes de esta migración la columna simplemente no existía.
    await queryRunner.query(`
      ALTER TABLE certificates
        DROP COLUMN "templateSnapshot"
    `);
  }
}
