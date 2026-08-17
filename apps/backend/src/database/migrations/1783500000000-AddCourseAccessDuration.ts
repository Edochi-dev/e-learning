import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddCourseAccessDuration — Acceso temporal a cursos.
 *
 * Cambio ADITIVO: ambas columnas son NULLABLE y null significa "permanente",
 * así que los cursos y las matrículas que ya existen conservan exactamente el
 * comportamiento que tenían antes de esta migración.
 */
export class AddCourseAccessDuration1783500000000 implements MigrationInterface {
  name = 'AddCourseAccessDuration1783500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "courses" ADD "accessDurationDays" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" ADD "expiresAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "enrollments" DROP COLUMN "expiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" DROP COLUMN "accessDurationDays"`,
    );
  }
}
