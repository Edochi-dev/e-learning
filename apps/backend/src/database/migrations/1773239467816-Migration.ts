import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1773239467816 implements MigrationInterface {
  name = 'Migration1773239467816';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" ADD "showDate" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" ADD "datePositionX" double precision NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" ADD "datePositionY" double precision NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" ADD "dateFontSize" integer NOT NULL DEFAULT '18'`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" ADD "dateColor" character varying NOT NULL DEFAULT '#000000'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" DROP COLUMN "dateColor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" DROP COLUMN "dateFontSize"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" DROP COLUMN "datePositionY"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" DROP COLUMN "datePositionX"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" DROP COLUMN "showDate"`,
    );
  }
}
