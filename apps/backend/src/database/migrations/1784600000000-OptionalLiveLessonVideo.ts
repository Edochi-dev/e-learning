import { MigrationInterface, QueryRunner } from 'typeorm';

/** A live class has no video until its recording is added. */
export class OptionalLiveLessonVideo1784600000000 implements MigrationInterface {
  name = 'OptionalLiveLessonVideo1784600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "video_lessons" ALTER COLUMN "videoUrl" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "video_lessons" SET "videoUrl" = '' WHERE "videoUrl" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "video_lessons" ALTER COLUMN "videoUrl" SET NOT NULL`,
    );
  }
}
