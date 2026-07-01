import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddPasswordResetTokens — Tabla para el flujo de "olvidé mi contraseña".
 *
 * Cambio ADITIVO: crea una tabla nueva, no toca datos existentes.
 *   - Guarda el HASH del token (nunca el token en claro).
 *   - ON DELETE CASCADE: si se borra un usuario, sus tokens se limpian solos.
 *   - Índice en tokenHash para el lookup al restablecer.
 */
export class AddPasswordResetTokens1782900000000 implements MigrationInterface {
  name = 'AddPasswordResetTokens1782900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "password_reset_tokens" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"userId" uuid NOT NULL, ` +
        `"tokenHash" character varying NOT NULL, ` +
        `"expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, ` +
        `"usedAt" TIMESTAMP WITH TIME ZONE, ` +
        `"createdAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_prt_tokenHash" ON "password_reset_tokens" ("tokenHash")`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_prt_userId" ` +
        `FOREIGN KEY ("userId") REFERENCES "users"("id") ` +
        `ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_prt_userId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_prt_tokenHash"`);
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
  }
}
