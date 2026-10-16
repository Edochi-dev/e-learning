import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  DueLiveClassReminder,
  LiveClassReminderGateway,
} from './gateways/live-class-reminder.gateway';

@Injectable()
export class LiveClassReminderRepository implements LiveClassReminderGateway {
  constructor(private readonly dataSource: DataSource) {}

  // Claim and read in one statement: ON CONFLICT DO NOTHING leaves out the
  // rows another caller already inserted, so each reminder is sent once.
  async claimDue(
    now: Date,
    leadMinutes: number,
  ): Promise<DueLiveClassReminder[]> {
    const rows: DueLiveClassReminder[] = await this.dataSource.query(
      `WITH due AS (
         SELECT l."id" AS "lessonId", u."id" AS "userId",
                v."liveStartsAt" AS "startsAt",
                u."email", u."fullName",
                c."id" AS "courseId", c."title" AS "courseTitle",
                l."title" AS "lessonTitle"
           FROM "video_lessons" v
           JOIN "lessons" l ON l."id" = v."lessonId"
           JOIN "courses" c ON c."id" = l."courseId"
           JOIN "enrollments" e ON e."courseId" = c."id"
           JOIN "users" u ON u."id" = e."userId"
          WHERE v."isLive" = true
            AND v."liveStartsAt" > $1
            AND v."liveStartsAt" <= $1 + make_interval(mins => $2)
            AND (e."expiresAt" IS NULL OR e."expiresAt" > $1)
       ), claimed AS (
         INSERT INTO "live_class_reminders" ("lessonId", "userId", "startsAt")
         SELECT "lessonId", "userId", "startsAt" FROM due
         ON CONFLICT DO NOTHING
         RETURNING "lessonId", "userId", "startsAt"
       )
       SELECT due."email", due."fullName", due."courseId", due."courseTitle",
              due."lessonId", due."lessonTitle", due."startsAt"
         FROM due
         JOIN claimed USING ("lessonId", "userId", "startsAt")
        ORDER BY due."startsAt"`,
      [now, leadMinutes],
    );
    return rows.map((row) => ({ ...row, startsAt: new Date(row.startsAt) }));
  }
}
