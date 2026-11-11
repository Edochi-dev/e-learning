import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-admin subscriptions to email alert topics, so each alert reaches only
 * whoever handles it. Existing admins (today just the teacher) start on the
 * pending-corrections reminder; other topics are assigned explicitly.
 */
export class AddUserAlertTopics1784800000000 implements MigrationInterface {
  name = 'AddUserAlertTopics1784800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "alertTopics" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "alertTopics" = '{pending_corrections}' WHERE "role" = 'admin'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "alertTopics"`);
  }
}
