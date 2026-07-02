import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddPushSubscriptions — Tabla de suscripciones web-push.
 *
 * Cambio ADITIVO. endpoint único (una fila por navegador suscrito).
 */
export class AddPushSubscriptions1783400000000 implements MigrationInterface {
  name = 'AddPushSubscriptions1783400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "push_subscriptions" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"userId" uuid NOT NULL, ` +
        `"endpoint" character varying NOT NULL, ` +
        `"p256dh" character varying NOT NULL, ` +
        `"auth" character varying NOT NULL, ` +
        `"createdAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_push_subscriptions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_push_subscriptions_endpoint" ON "push_subscriptions" ("endpoint")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_push_subscriptions_endpoint"`);
    await queryRunner.query(`DROP TABLE "push_subscriptions"`);
  }
}
