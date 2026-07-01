import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddCourseTaxonomy — Agrega category y level a los cursos, para clasificar y
 * filtrar en el catálogo.
 *
 * Cambio ADITIVO y seguro: ambas columnas son NULLABLE, así los cursos
 * existentes quedan con category/level = null (sin tocar sus datos).
 */
export class AddCourseTaxonomy1783000000000 implements MigrationInterface {
  name = 'AddCourseTaxonomy1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "courses" ADD "category" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD "level" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "level"`);
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "category"`);
  }
}
