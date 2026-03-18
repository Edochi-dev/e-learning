import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1772660199311 implements MigrationInterface {
  name = 'Migration1772660199311';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" ADD "paperFormat" character varying NOT NULL DEFAULT 'A4'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" DROP COLUMN "paperFormat"`,
    );
  }
}
