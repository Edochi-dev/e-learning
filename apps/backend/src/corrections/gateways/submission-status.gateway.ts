export type SubmissionState = 'pending' | 'approved' | 'rejected';

/** Where each practice of a course stands for one student. */
export abstract class SubmissionStatusGateway {
  /** lessonId → state; practices never submitted are absent. */
  abstract statusesByCourse(
    studentId: string,
    courseId: string,
  ): Promise<Record<string, SubmissionState>>;
}
