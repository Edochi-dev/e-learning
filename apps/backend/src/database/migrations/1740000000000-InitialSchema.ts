import { MigrationInterface, QueryRunner } from 'typeorm';

// Migración inicial: representa el esquema completo al comenzar a usar migrations.
// Usa IF NOT EXISTS para ser idempotente — seguro de ejecutar sobre una BD ya existente
// (por ejemplo, al migrar desde synchronize: true en desarrollo).
export class InitialSchema1740000000000 implements MigrationInterface {
    name = 'InitialSchema1740000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enum de roles de usuario
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'student');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);

        // Tabla de usuarios
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "users" (
                "id"        uuid                           NOT NULL,
                "email"     character varying              NOT NULL,
                "fullName"  character varying              NOT NULL,
                "password"  character varying              NOT NULL,
                "role"      "public"."users_role_enum"     NOT NULL DEFAULT 'student',
                "createdAt" TIMESTAMP                      NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_users_email"  UNIQUE ("email"),
                CONSTRAINT "PK_users_id"     PRIMARY KEY ("id")
            )
        `);

        // Tabla de cursos
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "courses" (
                "id"          uuid                NOT NULL,
                "title"       character varying   NOT NULL,
                "price"       numeric             NOT NULL,
                "description" text                NOT NULL,
                "isLive"      boolean             NOT NULL DEFAULT false,
                CONSTRAINT "PK_courses_id" PRIMARY KEY ("id")
            )
        `);

        // Tabla de lecciones
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "lessons" (
                "id"          uuid                NOT NULL,
                "title"       character varying   NOT NULL,
                "description" text                NOT NULL,
                "duration"    character varying   NOT NULL,
                "videoUrl"    character varying   NOT NULL,
                "courseId"    uuid,
                CONSTRAINT "PK_lessons_id" PRIMARY KEY ("id")
            )
        `);

        // FK lecciones → cursos (solo si no existe)
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "lessons"
                    ADD CONSTRAINT "FK_lessons_courseId"
                    FOREIGN KEY ("courseId") REFERENCES "courses"("id")
                    ON DELETE NO ACTION ON UPDATE NO ACTION;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lessons" DROP CONSTRAINT IF EXISTS "FK_lessons_courseId"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "lessons"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "courses"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
    }
}
