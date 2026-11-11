import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reviews become their own rows (with the teacher's voice note), so a
 * submission keeps its whole history. Existing written feedback is moved into
 * a review without audio, as its transcript, before the column is dropped.
 *
 * submissions.reviewedAt is a naive timestamp written by a Node process in
 * America/Santiago; that is the zone used to turn it into an instant.
 */
export class AddCorrectionReviews1784900000000 implements MigrationInterface {
  name = 'AddCorrectionReviews1784900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "correction_reviews" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"submissionId" uuid NOT NULL, ` +
        `"decision" character varying NOT NULL, ` +
        `"audioFile" character varying, ` +
        `"audioDurationSeconds" integer, ` +
        `"audioExpiresAt" TIMESTAMP WITH TIME ZONE, ` +
        `"transcript" text, ` +
        `"transcriptStatus" character varying NOT NULL DEFAULT 'pending', ` +
        `"reviewedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_correction_reviews" PRIMARY KEY ("id"), ` +
        `CONSTRAINT "FK_correction_reviews_submissionId" FOREIGN KEY ("submissionId") ` +
        `REFERENCES "assignment_submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_correction_reviews_submission_reviewedAt" ` +
        `ON "correction_reviews" ("submissionId", "reviewedAt")`,
    );
    await queryRunner.query(
      `INSERT INTO "correction_reviews" ` +
        `("submissionId", "decision", "transcript", "transcriptStatus", "reviewedAt") ` +
        `SELECT "id", ` +
        `CASE WHEN "status" = 'approved' THEN 'approved' ELSE 'rejected' END, ` +
        `"feedback", 'done', "reviewedAt" AT TIME ZONE 'America/Santiago' ` +
        `FROM "assignment_submissions" ` +
        `WHERE "feedback" IS NOT NULL AND "reviewedAt" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignment_submissions" DROP COLUMN "feedback"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assignment_submissions" ADD "feedback" text`,
    );
    // Only the latest review's text survives the way back.
    await queryRunner.query(
      `UPDATE "assignment_submissions" s SET "feedback" = r."transcript" ` +
        `FROM (SELECT DISTINCT ON ("submissionId") "submissionId", "transcript" ` +
        `FROM "correction_reviews" ORDER BY "submissionId", "reviewedAt" DESC) r ` +
        `WHERE r."submissionId" = s."id"`,
    );
    await queryRunner.query(`DROP TABLE "correction_reviews"`);
  }
}
