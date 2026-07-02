import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddScheduleEvents — Tabla de la agenda del panel admin.
 *
 * Cambio ADITIVO: tabla nueva, no toca datos existentes.
 *   - sourceType default 'personal' (personal | live_lesson espejo).
 *   - sourceId (uuid, nullable): lessonId cuando es espejo de clase en vivo.
 *   - reminderMinutesBefore/reminderSentAt: listos para las notis (web-push).
 *   - Índice en startAt para las consultas por rango del calendario.
 */
export class AddScheduleEvents1783200000000 implements MigrationInterface {
  name = 'AddScheduleEvents1783200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "schedule_events" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"title" character varying NOT NULL, ` +
        `"startAt" TIMESTAMP NOT NULL, ` +
        `"endAt" TIMESTAMP NOT NULL, ` +
        `"allDay" boolean NOT NULL DEFAULT false, ` +
        `"notes" text, ` +
        `"sourceType" character varying NOT NULL DEFAULT 'personal', ` +
        `"sourceId" uuid, ` +
        `"reminderMinutesBefore" integer, ` +
        `"reminderSentAt" TIMESTAMP, ` +
        `"createdAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_schedule_events" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_schedule_events_startAt" ON "schedule_events" ("startAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_schedule_events_startAt"`);
    await queryRunner.query(`DROP TABLE "schedule_events"`);
  }
}
