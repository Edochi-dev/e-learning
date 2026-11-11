import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CourseUsageGateway } from './gateways/course-usage.gateway';

// Plain SQL rather than the Enrollment/Order entities: those modules depend
// on courses, so importing their repositories here would close a cycle.
@Injectable()
export class CourseUsageRepository implements CourseUsageGateway {
  constructor(private readonly dataSource: DataSource) {}

  async hasEnrollmentsOrOrders(courseId: string): Promise<boolean> {
    const [row]: { used: boolean }[] = await this.dataSource.query(
      `SELECT EXISTS (SELECT 1 FROM "enrollments" WHERE "courseId" = $1)
           OR EXISTS (SELECT 1 FROM "orders" WHERE "courseId" = $1) AS "used"`,
      [courseId],
    );
    return row.used;
  }
}
