import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Video progress becomes the set of watched segments (bit i = the i-th 1% of
 * the video), merged with OR on every report. Rows that only had a percentage
 * are backfilled as the first N% watched, the most likely shape of that data.
 */
export class AddWatchedSegments1785000000000 implements MigrationInterface {
  name = 'AddWatchedSegments1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lesson_progress" ADD "watchedSegments" bit(100) NOT NULL ` +
        `DEFAULT repeat('0', 100)::bit(100)`,
    );
    await queryRunner.query(
      `UPDATE "lesson_progress" SET "watchedSegments" = (` +
        `repeat('1', LEAST(100, floor("watchedPercent")::int)) || ` +
        `repeat('0', 100 - LEAST(100, floor("watchedPercent")::int)))::bit(100) ` +
        `WHERE "watchedPercent" >= 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lesson_progress" DROP COLUMN "watchedSegments"`,
    );
  }
}
