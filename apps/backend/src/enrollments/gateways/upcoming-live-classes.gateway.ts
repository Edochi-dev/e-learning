import { UpcomingLiveClass } from '@maris-nails/shared';

/** Read model for the student's schedule; spans enrollments and lessons. */
export abstract class UpcomingLiveClassesGateway {
  /** Live classes not yet over in the student's active enrollments, soonest first. */
  abstract findForStudent(
    userId: string,
    now: Date,
    limit: number,
  ): Promise<UpcomingLiveClass[]>;
}
