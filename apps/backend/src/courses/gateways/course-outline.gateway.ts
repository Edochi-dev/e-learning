import type { LessonType } from '@maris-nails/shared';

export interface LessonOutline {
  id: string;
  type: LessonType;
}

/** A course's lessons in order, without their content. */
export abstract class CourseOutlineGateway {
  abstract findOutline(courseId: string): Promise<LessonOutline[]>;
}
