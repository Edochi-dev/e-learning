import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddCertificateDate backfilled `issuedAt::date`, the UTC day, but the PDFs
 * printed the business day (America/Santiago). Certificates issued in the
 * Chilean evening ended up one day ahead on the verification page.
 *
 * Only rows that still hold the backfilled value and predate the deploy of
 * that migration are touched: later rows got an explicit, correct date.
 */
const DEPLOYED_AT_UTC = '2026-10-09 00:39:49';
const BUSINESS_DAY = `("issuedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::date`;

export class FixBackfilledCertificateDates1784000000000 implements MigrationInterface {
  name = 'FixBackfilledCertificateDates1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "certificates" SET "certificateDate" = ${BUSINESS_DAY}
       WHERE "issuedAt" < $1
         AND "certificateDate" = "issuedAt"::date
         AND ${BUSINESS_DAY} <> "certificateDate"`,
      [DEPLOYED_AT_UTC],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "certificates" SET "certificateDate" = "issuedAt"::date
       WHERE "issuedAt" < $1
         AND "certificateDate" = ${BUSINESS_DAY}
         AND "issuedAt"::date <> "certificateDate"`,
      [DEPLOYED_AT_UTC],
    );
  }
}
