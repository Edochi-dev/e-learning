import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Draft/published state for courses, and RESTRICT instead of CASCADE from
 * courses to enrollments and orders, so deleting a course can never take
 * students' access or payment records with it. Existing courses stay
 * published to keep today's catalog unchanged.
 */
export class AddCoursePublication1784400000000 implements MigrationInterface {
  name = 'AddCoursePublication1784400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "courses" ADD "publishedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`UPDATE "courses" SET "publishedAt" = now()`);
    await this.setCourseFks(queryRunner, 'RESTRICT');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.setCourseFks(queryRunner, 'CASCADE');
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "publishedAt"`);
  }

  private async setCourseFks(
    queryRunner: QueryRunner,
    onDelete: 'RESTRICT' | 'CASCADE',
  ): Promise<void> {
    for (const table of ['enrollments', 'orders']) {
      const fk = `FK_${table}_courseId`;
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${fk}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${fk}" FOREIGN KEY ("courseId") ` +
          `REFERENCES "courses"("id") ON DELETE ${onDelete} ON UPDATE NO ACTION`,
      );
    }
  }
}
