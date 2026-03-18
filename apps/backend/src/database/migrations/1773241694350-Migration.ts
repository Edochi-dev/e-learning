import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1773241694350 implements MigrationInterface {
  name = 'Migration1773241694350';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" ADD "nameAlign" character varying NOT NULL DEFAULT 'left'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" DROP COLUMN "nameAlign"`,
    );
  }
}
