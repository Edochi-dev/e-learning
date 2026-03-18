import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1773243621356 implements MigrationInterface {
  name = 'Migration1773243621356';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" ADD "dateAlign" character varying NOT NULL DEFAULT 'left'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" DROP COLUMN "dateAlign"`,
    );
  }
}
