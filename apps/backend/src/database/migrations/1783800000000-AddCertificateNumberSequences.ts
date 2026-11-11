import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds each sequence with the highest number already issued for that prefix
 * (MAX, not COUNT: certificates deleted before this migration left gaps).
 */
export class AddCertificateNumberSequences1783800000000 implements MigrationInterface {
  name = 'AddCertificateNumberSequences1783800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "certificate_number_sequences" (
        "abbreviation" character varying NOT NULL,
        "lastNumber" integer NOT NULL,
        CONSTRAINT "PK_certificate_number_sequences" PRIMARY KEY ("abbreviation")
      )`,
    );
    await queryRunner.query(
      `INSERT INTO "certificate_number_sequences" ("abbreviation", "lastNumber")
       SELECT parts[1], MAX(parts[2]::int)
       FROM (
         SELECT regexp_match("certificateNumber", '^(.+)-(\\d+)$') AS parts
         FROM "certificates"
       ) AS numbered
       WHERE parts IS NOT NULL
       GROUP BY parts[1]`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "certificate_number_sequences"`);
  }
}
