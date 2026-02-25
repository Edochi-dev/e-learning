import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migración: mover isLive de la tabla 'courses' a la tabla 'lessons'
 *
 * El cliente nos pidió que un curso pueda tener lecciones mixtas
 * (algunas en vivo, otras grabadas), así que el atributo ya no
 * pertenece al curso completo sino a cada lección individual.
 *
 * up()   → aplica el cambio
 * down() → lo revierte (útil si necesitamos hacer rollback)
 */
export class MoveLessonIsLive1771952849168 implements MigrationInterface {
    name = 'MoveLessonIsLive1771952849168';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Quitar isLive de la tabla de cursos
        await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "isLive"`);

        // Agregar isLive a la tabla de lecciones (default false = grabada)
        await queryRunner.query(`ALTER TABLE "lessons" ADD "isLive" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN "isLive"`);
        await queryRunner.query(`ALTER TABLE "courses" ADD "isLive" boolean NOT NULL DEFAULT false`);
    }
}
