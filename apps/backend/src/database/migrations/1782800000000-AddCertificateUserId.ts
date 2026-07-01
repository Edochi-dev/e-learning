import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddCertificateUserId — Vincula (opcionalmente) un certificado a una cuenta.
 *
 * Cambio ADITIVO y seguro para los datos existentes:
 *   - `userId` es NULLABLE → los certificados ya emitidos quedan con userId=null
 *     (siguen intactos; su verificación pública por número no cambia).
 *   - FK con ON DELETE SET NULL → si se borra un usuario, su certificado se
 *     conserva como registro histórico (solo se desvincula), nunca se borra.
 *   - Índice en userId → para resolver rápido "los certificados de este alumno"
 *     (GET /certificates/me).
 */
export class AddCertificateUserId1782800000000 implements MigrationInterface {
  name = 'AddCertificateUserId1782800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "certificates" ADD "userId" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_certificates_userId" ON "certificates" ("userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificates" ADD CONSTRAINT "FK_certificates_userId" ` +
        `FOREIGN KEY ("userId") REFERENCES "users"("id") ` +
        `ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificates" DROP CONSTRAINT "FK_certificates_userId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_certificates_userId"`);
    await queryRunner.query(`ALTER TABLE "certificates" DROP COLUMN "userId"`);
  }
}
