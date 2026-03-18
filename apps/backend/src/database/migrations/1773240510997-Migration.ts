import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1773240510997 implements MigrationInterface {
  name = 'Migration1773240510997';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" ADD "dateFontFamily" character varying NOT NULL DEFAULT 'Helvetica'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" DROP COLUMN "dateFontFamily"`,
    );
  }
}
