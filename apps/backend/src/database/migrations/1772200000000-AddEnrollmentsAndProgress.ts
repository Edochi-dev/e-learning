import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddEnrollmentsAndProgress — Crea las tablas para el sistema de matrículas y progreso.
 *
 * Tabla enrollments:
 *   - Registra qué usuarios están inscritos en qué cursos.
 *   - UNIQUE(userId, courseId) impide matrículas duplicadas a nivel de DB.
 *   - ON DELETE CASCADE: si se borra el usuario o el curso, se borra la matrícula.
 *
 * Tabla lesson_progress:
 *   - Registra qué lecciones completó cada usuario.
 *   - UNIQUE(userId, lessonId) hace la operación idempotente a nivel de DB.
 *   - ON DELETE CASCADE: si se borra el usuario o la lección, se borra el progreso.
 *
 * Nota sobre IDs:
 *   TypeORM genera los UUIDs en JavaScript antes de insertar, por eso las columnas
 *   "id" son uuid NOT NULL sin DEFAULT — a diferencia de un serial o un uuid_generate_v4().
 */
export class AddEnrollmentsAndProgress1772200000000 implements MigrationInterface {
    name = 'AddEnrollmentsAndProgress1772200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "enrollments" (
                "id"         uuid                NOT NULL,
                "userId"     uuid                NOT NULL,
                "courseId"   uuid                NOT NULL,
                "enrolledAt" TIMESTAMP           NOT NULL DEFAULT now(),
                CONSTRAINT "PK_enrollments_id"              PRIMARY KEY ("id"),
                CONSTRAINT "UQ_enrollments_userId_courseId" UNIQUE ("userId", "courseId"),
                CONSTRAINT "FK_enrollments_userId"          FOREIGN KEY ("userId")
                    REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_enrollments_courseId"        FOREIGN KEY ("courseId")
                    REFERENCES "courses"("id") ON DELETE CASCADE
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "lesson_progress" (
                "id"          uuid                NOT NULL,
                "userId"      uuid                NOT NULL,
                "lessonId"    uuid                NOT NULL,
                "completedAt" TIMESTAMP           NOT NULL DEFAULT now(),
                CONSTRAINT "PK_lesson_progress_id"               PRIMARY KEY ("id"),
                CONSTRAINT "UQ_lesson_progress_userId_lessonId"  UNIQUE ("userId", "lessonId"),
                CONSTRAINT "FK_lesson_progress_userId"           FOREIGN KEY ("userId")
                    REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_lesson_progress_lessonId"         FOREIGN KEY ("lessonId")
                    REFERENCES "lessons"("id") ON DELETE CASCADE
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "lesson_progress"`);
        await queryRunner.query(`DROP TABLE "enrollments"`);
    }
}
