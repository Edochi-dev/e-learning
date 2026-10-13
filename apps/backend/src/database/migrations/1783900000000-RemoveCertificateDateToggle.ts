import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Every certificate now prints its date. Templates that had it hidden start
 * printing it at their stored position, so place the date on them before
 * deploying (verified in production on 2026-10-13: none left hidden).
 */
export class RemoveCertificateDateToggle1783900000000 implements MigrationInterface {
  name = 'RemoveCertificateDateToggle1783900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "certificate_templates" SET "dateStyle" = "dateStyle" - 'show'`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" ALTER COLUMN "dateStyle"
       SET DEFAULT '{"positionX":0,"positionY":0,"fontSize":18,"color":"#000000","fontFamily":"Helvetica","align":"left"}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "certificate_templates" SET "dateStyle" = "dateStyle" || '{"show":true}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate_templates" ALTER COLUMN "dateStyle"
       SET DEFAULT '{"show":true,"positionX":0,"positionY":0,"fontSize":18,"color":"#000000","fontFamily":"Helvetica","align":"left"}'`,
    );
  }
}
