import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFkIndexes1772577517213 implements MigrationInterface {
  name = 'AddFkIndexes1772577517213';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_enrollment_courseId" ON "enrollments" ("courseId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lesson_progress_lessonId" ON "lesson_progress" ("lessonId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_lesson_progress_lessonId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_enrollment_courseId"`);
  }
}
