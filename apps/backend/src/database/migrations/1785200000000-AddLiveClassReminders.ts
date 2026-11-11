import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLiveClassReminders1785200000000 implements MigrationInterface {
  name = 'AddLiveClassReminders1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "live_class_reminders" (` +
        `"lessonId" uuid NOT NULL, ` +
        `"userId" uuid NOT NULL, ` +
        `"startsAt" TIMESTAMP WITH TIME ZONE NOT NULL, ` +
        `"sentAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_live_class_reminders" PRIMARY KEY ("lessonId", "userId", "startsAt"), ` +
        `CONSTRAINT "FK_live_class_reminders_lesson" FOREIGN KEY ("lessonId") ` +
        `REFERENCES "lessons"("id") ON DELETE CASCADE, ` +
        `CONSTRAINT "FK_live_class_reminders_user" FOREIGN KEY ("userId") ` +
        `REFERENCES "users"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_live_class_reminders_userId" ON "live_class_reminders" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "live_class_reminders"`);
  }
}
