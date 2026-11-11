import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UpcomingLiveClass } from '@maris-nails/shared';
import { UpcomingLiveClassesGateway } from '../gateways/upcoming-live-classes.gateway';

interface Row {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  liveStartsAt: Date;
  liveEndsAt: Date;
}

@Injectable()
export class UpcomingLiveClassesRepository implements UpcomingLiveClassesGateway {
  constructor(private readonly dataSource: DataSource) {}

  async findForStudent(
    userId: string,
    now: Date,
    limit: number,
  ): Promise<UpcomingLiveClass[]> {
    const rows: Row[] = await this.dataSource.query(
      `SELECT c."id" AS "courseId", c."title" AS "courseTitle",
              l."id" AS "lessonId", l."title" AS "lessonTitle",
              v."liveStartsAt", v."liveEndsAt"
         FROM "enrollments" e
         JOIN "courses" c ON c."id" = e."courseId"
         JOIN "lessons" l ON l."courseId" = c."id"
         JOIN "video_lessons" v ON v."lessonId" = l."id"
        WHERE e."userId" = $1
          AND (e."expiresAt" IS NULL OR e."expiresAt" > $2)
          AND v."isLive" = true
          AND v."liveEndsAt" > $2
        ORDER BY v."liveStartsAt" ASC
        LIMIT $3`,
      [userId, now, limit],
    );
    return rows.map((r) => ({
      ...r,
      liveStartsAt: new Date(r.liveStartsAt).toISOString(),
      liveEndsAt: new Date(r.liveEndsAt).toISOString(),
    }));
  }
}
