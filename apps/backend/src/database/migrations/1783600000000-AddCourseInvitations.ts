import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddCourseInvitations — Enlaces de un solo uso para dar acceso a un curso.
 *
 * `tokenHash` es UNIQUE: además de crear el índice por el que se busca al
 * canjear, impide a nivel de base de datos que dos filas compartan token.
 *
 * `redeemedByUserId` es ON DELETE SET NULL, no CASCADE: si se borra la cuenta
 * de la alumna, la invitación debe seguir constando como usada. Borrarla
 * dejaría el enlace disponible de nuevo.
 */
export class AddCourseInvitations1783600000000 implements MigrationInterface {
  name = 'AddCourseInvitations1783600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "course_invitations" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"tokenHash" character varying NOT NULL, ` +
        `"courseId" uuid NOT NULL, ` +
        `"expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, ` +
        `"redeemedAt" TIMESTAMP WITH TIME ZONE, ` +
        `"redeemedByUserId" uuid, ` +
        `"revokedAt" TIMESTAMP WITH TIME ZONE, ` +
        `"createdByUserId" uuid NOT NULL, ` +
        `"label" character varying, ` +
        `"createdAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "UQ_course_invitations_tokenHash" UNIQUE ("tokenHash"), ` +
        `CONSTRAINT "PK_course_invitations" PRIMARY KEY ("id")` +
        `)`,
    );

    // Índice para el listado de la profesora: "invitaciones de este curso".
    await queryRunner.query(
      `CREATE INDEX "IDX_course_invitations_courseId" ON "course_invitations" ("courseId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "course_invitations" ADD CONSTRAINT "FK_course_invitations_courseId" ` +
        `FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE`,
    );

    await queryRunner.query(
      `ALTER TABLE "course_invitations" ADD CONSTRAINT "FK_course_invitations_redeemedByUserId" ` +
        `FOREIGN KEY ("redeemedByUserId") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_invitations" DROP CONSTRAINT "FK_course_invitations_redeemedByUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_invitations" DROP CONSTRAINT "FK_course_invitations_courseId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_course_invitations_courseId"`);
    await queryRunner.query(`DROP TABLE "course_invitations"`);
  }
}
