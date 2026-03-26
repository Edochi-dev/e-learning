import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SplitLessonInheritance — Migra de Single Table a Joined Table Inheritance.
 *
 * ANTES: una tabla `lessons` con campos nullable para video y exam.
 * DESPUÉS: tabla base `lessons` + tablas hijas `video_lessons` y `exam_lessons`.
 *
 * Fases:
 * 1. Crear tablas hijas con PK que es también FK a lessons.id
 * 2. Migrar datos existentes de lessons a las tablas hijas
 * 3. Eliminar las columnas que ya no pertenecen a la tabla base
 */
export class SplitLessonInheritance1774500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Fase 1: Crear tablas hijas ─────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "video_lessons" (
        "lessonId" uuid NOT NULL,
        "videoUrl" character varying NOT NULL,
        "duration" character varying,
        "isLive" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_video_lessons" PRIMARY KEY ("lessonId"),
        CONSTRAINT "FK_video_lessons_lessonId" FOREIGN KEY ("lessonId")
          REFERENCES "lessons"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "exam_lessons" (
        "lessonId" uuid NOT NULL,
        "passingScore" integer NOT NULL,
        CONSTRAINT "PK_exam_lessons" PRIMARY KEY ("lessonId"),
        CONSTRAINT "FK_exam_lessons_lessonId" FOREIGN KEY ("lessonId")
          REFERENCES "lessons"("id") ON DELETE CASCADE
      )
    `);

    // ── Fase 2: Migrar datos existentes ────────────────────────────────

    await queryRunner.query(`
      INSERT INTO "video_lessons" ("lessonId", "videoUrl", "duration", "isLive")
      SELECT "id", "videoUrl", "duration", "isLive"
      FROM "lessons"
      WHERE "type" = 'class' AND "videoUrl" IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT INTO "exam_lessons" ("lessonId", "passingScore")
      SELECT "id", "passingScore"
      FROM "lessons"
      WHERE "type" = 'exam' AND "passingScore" IS NOT NULL
    `);

    // ── Fase 3: Eliminar columnas viejas de la tabla base ──────────────

    await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN "videoUrl"`);
    await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN "duration"`);
    await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN "isLive"`);
    await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN "passingScore"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Restaurar columnas en la tabla base ────────────────────────────

    await queryRunner.query(`ALTER TABLE "lessons" ADD "videoUrl" character varying`);
    await queryRunner.query(`ALTER TABLE "lessons" ADD "duration" character varying`);
    await queryRunner.query(`ALTER TABLE "lessons" ADD "isLive" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "lessons" ADD "passingScore" integer`);

    // ── Copiar datos de vuelta ─────────────────────────────────────────

    await queryRunner.query(`
      UPDATE "lessons" SET
        "videoUrl" = vl."videoUrl",
        "duration" = vl."duration",
        "isLive" = vl."isLive"
      FROM "video_lessons" vl
      WHERE "lessons"."id" = vl."lessonId"
    `);

    await queryRunner.query(`
      UPDATE "lessons" SET "passingScore" = el."passingScore"
      FROM "exam_lessons" el
      WHERE "lessons"."id" = el."lessonId"
    `);

    // ── Eliminar tablas hijas ──────────────────────────────────────────

    await queryRunner.query(`DROP TABLE "exam_lessons"`);
    await queryRunner.query(`DROP TABLE "video_lessons"`);
  }
}
