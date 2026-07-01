import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddNameChangeRequests — Tabla para el flujo de cambio de nombre por solicitud.
 *
 * Cambio ADITIVO: crea una tabla nueva, no toca datos existentes.
 *   - status con default 'pending' (pending → approved | rejected).
 *   - feedback (text, nullable): nota del admin al revisar.
 *   - ON DELETE CASCADE: si se borra un usuario, sus solicitudes se limpian.
 *   - Índices: userId (para findLatestByUser) y status (para findPending).
 *
 * uuid_generate_v4() ya está disponible: lo habilitó una migración anterior.
 */
export class AddNameChangeRequests1783100000000 implements MigrationInterface {
  name = 'AddNameChangeRequests1783100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "name_change_requests" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"userId" uuid NOT NULL, ` +
        `"currentName" character varying NOT NULL, ` +
        `"requestedName" character varying NOT NULL, ` +
        `"status" character varying NOT NULL DEFAULT 'pending', ` +
        `"feedback" text, ` +
        `"createdAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `"reviewedAt" TIMESTAMP, ` +
        `CONSTRAINT "PK_name_change_requests" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ncr_userId" ON "name_change_requests" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ncr_status" ON "name_change_requests" ("status")`,
    );
    await queryRunner.query(
      `ALTER TABLE "name_change_requests" ADD CONSTRAINT "FK_ncr_userId" ` +
        `FOREIGN KEY ("userId") REFERENCES "users"("id") ` +
        `ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "name_change_requests" DROP CONSTRAINT "FK_ncr_userId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_ncr_status"`);
    await queryRunner.query(`DROP INDEX "IDX_ncr_userId"`);
    await queryRunner.query(`DROP TABLE "name_change_requests"`);
  }
}
