import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Submission dates become instants (timestamptz). As naive timestamps they
 * mixed two clocks: a first submission got DEFAULT now() in the database's
 * zone (UTC) while a resubmission got Node's local time (America/Santiago),
 * so first submissions showed 3 hours late and the review queue misordered.
 *
 * Existing values are read as America/Santiago, the zone Node writes in.
 * Production had no submissions when this was written (2026-10-16).
 */
export class SubmissionDatesAsInstants1785100000000 implements MigrationInterface {
  name = 'SubmissionDatesAsInstants1785100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assignment_submissions" ` +
        `ALTER COLUMN "submittedAt" TYPE TIMESTAMP WITH TIME ZONE ` +
        `USING "submittedAt" AT TIME ZONE 'America/Santiago', ` +
        `ALTER COLUMN "submittedAt" SET DEFAULT now(), ` +
        `ALTER COLUMN "reviewedAt" TYPE TIMESTAMP WITH TIME ZONE ` +
        `USING "reviewedAt" AT TIME ZONE 'America/Santiago'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assignment_submissions" ` +
        `ALTER COLUMN "submittedAt" TYPE TIMESTAMP ` +
        `USING "submittedAt" AT TIME ZONE 'America/Santiago', ` +
        `ALTER COLUMN "submittedAt" SET DEFAULT now(), ` +
        `ALTER COLUMN "reviewedAt" TYPE TIMESTAMP ` +
        `USING "reviewedAt" AT TIME ZONE 'America/Santiago'`,
    );
  }
}
