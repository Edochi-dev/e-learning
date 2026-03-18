import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeLessonDurationNullable1773500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lessons" ALTER COLUMN "duration" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Antes de restaurar NOT NULL, rellenamos los NULL con un valor por defecto
    await queryRunner.query(
      `UPDATE "lessons" SET "duration" = '00:00' WHERE "duration" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "lessons" ALTER COLUMN "duration" SET NOT NULL`,
    );
  }
}
