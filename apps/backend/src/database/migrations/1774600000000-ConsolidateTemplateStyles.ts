import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ConsolidateTemplateStyles — Migra 16 columnas planas de styling a 3 columnas jsonb.
 *
 * ANTES: namePositionX, namePositionY, nameFontSize, nameColor, fontFamily, nameAlign,
 *        qrPositionX, qrPositionY, qrSize,
 *        showDate, datePositionX, datePositionY, dateFontSize, dateColor, dateFontFamily, dateAlign
 *
 * DESPUÉS: nameStyle (jsonb), qrStyle (jsonb), dateStyle (jsonb)
 *
 * La migración es reversible: el down() recrea las columnas planas desde el jsonb.
 */
export class ConsolidateTemplateStyles1774600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar las 3 columnas jsonb con defaults
    await queryRunner.query(`
      ALTER TABLE certificate_templates
        ADD COLUMN "nameStyle" jsonb NOT NULL DEFAULT '{"positionX":0,"positionY":0,"fontSize":28,"color":"#000000","fontFamily":"Helvetica","align":"left"}',
        ADD COLUMN "qrStyle"   jsonb NOT NULL DEFAULT '{"positionX":0,"positionY":0,"size":80}',
        ADD COLUMN "dateStyle" jsonb NOT NULL DEFAULT '{"show":true,"positionX":0,"positionY":0,"fontSize":18,"color":"#000000","fontFamily":"Helvetica","align":"left"}'
    `);

    // 2. Poblar desde las columnas planas existentes (para filas que ya existen)
    await queryRunner.query(`
      UPDATE certificate_templates SET
        "nameStyle" = jsonb_build_object(
          'positionX', "namePositionX",
          'positionY', "namePositionY",
          'fontSize',  "nameFontSize",
          'color',     "nameColor",
          'fontFamily', COALESCE("fontFamily", 'Helvetica'),
          'align',     COALESCE("nameAlign", 'left')
        ),
        "qrStyle" = jsonb_build_object(
          'positionX', "qrPositionX",
          'positionY', "qrPositionY",
          'size',      "qrSize"
        ),
        "dateStyle" = jsonb_build_object(
          'show',       COALESCE("showDate", true),
          'positionX',  "datePositionX",
          'positionY',  "datePositionY",
          'fontSize',   "dateFontSize",
          'color',      COALESCE("dateColor", '#000000'),
          'fontFamily', COALESCE("dateFontFamily", 'Helvetica'),
          'align',      COALESCE("dateAlign", 'left')
        )
    `);

    // 3. Dropear las columnas planas que ya no se necesitan
    await queryRunner.query(`
      ALTER TABLE certificate_templates
        DROP COLUMN "namePositionX",
        DROP COLUMN "namePositionY",
        DROP COLUMN "nameFontSize",
        DROP COLUMN "nameColor",
        DROP COLUMN "fontFamily",
        DROP COLUMN "nameAlign",
        DROP COLUMN "qrPositionX",
        DROP COLUMN "qrPositionY",
        DROP COLUMN "qrSize",
        DROP COLUMN "showDate",
        DROP COLUMN "datePositionX",
        DROP COLUMN "datePositionY",
        DROP COLUMN "dateFontSize",
        DROP COLUMN "dateColor",
        DROP COLUMN "dateFontFamily",
        DROP COLUMN "dateAlign"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recrear las columnas planas
    await queryRunner.query(`
      ALTER TABLE certificate_templates
        ADD COLUMN "namePositionX" float NOT NULL DEFAULT 0,
        ADD COLUMN "namePositionY" float NOT NULL DEFAULT 0,
        ADD COLUMN "nameFontSize"  int NOT NULL DEFAULT 28,
        ADD COLUMN "nameColor"     varchar NOT NULL DEFAULT '#000000',
        ADD COLUMN "fontFamily"    varchar NOT NULL DEFAULT 'Helvetica',
        ADD COLUMN "nameAlign"     varchar NOT NULL DEFAULT 'left',
        ADD COLUMN "qrPositionX"   float NOT NULL DEFAULT 0,
        ADD COLUMN "qrPositionY"   float NOT NULL DEFAULT 0,
        ADD COLUMN "qrSize"        float NOT NULL DEFAULT 80,
        ADD COLUMN "showDate"      boolean NOT NULL DEFAULT true,
        ADD COLUMN "datePositionX" float NOT NULL DEFAULT 0,
        ADD COLUMN "datePositionY" float NOT NULL DEFAULT 0,
        ADD COLUMN "dateFontSize"  int NOT NULL DEFAULT 18,
        ADD COLUMN "dateColor"     varchar NOT NULL DEFAULT '#000000',
        ADD COLUMN "dateFontFamily" varchar NOT NULL DEFAULT 'Helvetica',
        ADD COLUMN "dateAlign"     varchar NOT NULL DEFAULT 'left'
    `);

    // Repoblar desde jsonb
    await queryRunner.query(`
      UPDATE certificate_templates SET
        "namePositionX" = ("nameStyle"->>'positionX')::float,
        "namePositionY" = ("nameStyle"->>'positionY')::float,
        "nameFontSize"  = ("nameStyle"->>'fontSize')::int,
        "nameColor"     = "nameStyle"->>'color',
        "fontFamily"    = "nameStyle"->>'fontFamily',
        "nameAlign"     = "nameStyle"->>'align',
        "qrPositionX"   = ("qrStyle"->>'positionX')::float,
        "qrPositionY"   = ("qrStyle"->>'positionY')::float,
        "qrSize"        = ("qrStyle"->>'size')::float,
        "showDate"      = ("dateStyle"->>'show')::boolean,
        "datePositionX" = ("dateStyle"->>'positionX')::float,
        "datePositionY" = ("dateStyle"->>'positionY')::float,
        "dateFontSize"  = ("dateStyle"->>'fontSize')::int,
        "dateColor"     = "dateStyle"->>'color',
        "dateFontFamily" = "dateStyle"->>'fontFamily',
        "dateAlign"     = "dateStyle"->>'align'
    `);

    // Dropear las columnas jsonb
    await queryRunner.query(`
      ALTER TABLE certificate_templates
        DROP COLUMN "nameStyle",
        DROP COLUMN "qrStyle",
        DROP COLUMN "dateStyle"
    `);
  }
}
