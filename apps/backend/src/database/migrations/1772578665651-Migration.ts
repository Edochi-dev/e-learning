import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1772578665651 implements MigrationInterface {
  name = 'Migration1772578665651';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "enrollments" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_progress" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lesson_progress" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" ALTER COLUMN "id" DROP DEFAULT`,
    );
  }
}
