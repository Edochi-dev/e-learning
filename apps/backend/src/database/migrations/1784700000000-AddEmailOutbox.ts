import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailOutbox1784700000000 implements MigrationInterface {
  name = 'AddEmailOutbox1784700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "email_outbox" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"recipient" character varying NOT NULL, ` +
        `"subject" character varying NOT NULL, ` +
        `"body" text NOT NULL, ` +
        `"priority" smallint NOT NULL DEFAULT 1, ` +
        `"status" character varying NOT NULL DEFAULT 'pending', ` +
        `"attempts" integer NOT NULL DEFAULT 0, ` +
        `"nextAttemptAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"lastError" text, ` +
        `"provider" character varying, ` +
        `"sentAt" TIMESTAMP WITH TIME ZONE, ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_email_outbox" PRIMARY KEY ("id"))`,
    );
    // Partial: sent and failed rows pile up, but the worker only scans pending.
    await queryRunner.query(
      `CREATE INDEX "IDX_email_outbox_pending" ON "email_outbox" ("priority", "createdAt") ` +
        `WHERE "status" = 'pending'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_email_outbox_pending"`);
    await queryRunner.query(`DROP TABLE "email_outbox"`);
  }
}
