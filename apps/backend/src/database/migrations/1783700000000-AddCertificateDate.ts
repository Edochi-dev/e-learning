import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Existing certificates are backfilled with the day they were issued, which is
 * exactly the date already printed on their PDFs.
 */
export class AddCertificateDate1783700000000 implements MigrationInterface {
  name = 'AddCertificateDate1783700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificates" ADD "certificateDate" date`,
    );
    await queryRunner.query(
      `UPDATE "certificates" SET "certificateDate" = "issuedAt"::date`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificates" ALTER COLUMN "certificateDate" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificates" DROP COLUMN "certificateDate"`,
    );
  }
}
