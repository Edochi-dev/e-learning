import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddLiveLessonSchedule — Fecha/hora a las lecciones en vivo.
 *
 * Cambio ADITIVO: dos columnas nullable en video_lessons. Es la fuente de verdad
 * del horario de la clase en vivo; su espejo para el calendario vive en
 * schedule_events (sourceType 'live_lesson').
 */
export class AddLiveLessonSchedule1783300000000 implements MigrationInterface {
  name = 'AddLiveLessonSchedule1783300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "video_lessons" ADD "liveStartsAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "video_lessons" ADD "liveEndsAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "video_lessons" DROP COLUMN "liveEndsAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "video_lessons" DROP COLUMN "liveStartsAt"`,
    );
  }
}
