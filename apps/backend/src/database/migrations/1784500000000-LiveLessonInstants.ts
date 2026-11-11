import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Live class times become instants. They were stored as zone-less wall-clock
 * values written by a Node process running in America/Santiago, so that is
 * the zone they are read in during the conversion.
 */
export class LiveLessonInstants1784500000000 implements MigrationInterface {
  name = 'LiveLessonInstants1784500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of ['liveStartsAt', 'liveEndsAt']) {
      await queryRunner.query(
        `ALTER TABLE "video_lessons" ALTER COLUMN "${column}" TYPE TIMESTAMP WITH TIME ZONE ` +
          `USING "${column}" AT TIME ZONE 'America/Santiago'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of ['liveStartsAt', 'liveEndsAt']) {
      await queryRunner.query(
        `ALTER TABLE "video_lessons" ALTER COLUMN "${column}" TYPE TIMESTAMP ` +
          `USING "${column}" AT TIME ZONE 'America/Santiago'`,
      );
    }
  }
}
