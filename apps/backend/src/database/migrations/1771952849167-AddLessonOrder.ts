import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migración: agregar columna `order` a la tabla `lessons`
 *
 * up()   → aplica el cambio (agrega la columna)
 * down() → revierte el cambio (borra la columna)
 *
 * DEFAULT 0 para que las lecciones existentes no queden con NULL.
 * Después del deploy se puede re-ordenar manualmente si se desea.
 */
export class AddLessonOrder1771952849167 implements MigrationInterface {
    name = 'AddLessonOrder1771952849167';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lessons" ADD "order" integer NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN "order"`);
    }
}
