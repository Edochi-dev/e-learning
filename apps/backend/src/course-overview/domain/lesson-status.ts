import { LessonStatus, LessonType } from '@maris-nails/shared';
import type { SubmissionState } from '../../corrections/gateways/submission-status.gateway';

export interface LessonFacts {
  completed: boolean;
  watchedPercent: number;
  /** Latest quiz attempt; undefined when never attempted. */
  quizPassed?: boolean;
  submission?: SubmissionState;
}

type StatusResolver = (facts: LessonFacts) => LessonStatus;

/**
 * Each lesson type reaches its status its own way: a class is watched, a quiz
 * is passed, a practice is approved by the teacher. Completion wins over all.
 */
const RESOLVERS: Record<LessonType, StatusResolver> = {
  [LessonType.CLASS]: (f) =>
    f.watchedPercent > 0 ? LessonStatus.IN_PROGRESS : LessonStatus.NOT_STARTED,
  [LessonType.EXAM]: (f) =>
    f.quizPassed === false ? LessonStatus.FAILED : LessonStatus.NOT_STARTED,
  [LessonType.CORRECTION]: (f) => SUBMISSION_STATUS[f.submission ?? 'none'],
};

const SUBMISSION_STATUS: Record<SubmissionState | 'none', LessonStatus> = {
  none: LessonStatus.NOT_STARTED,
  pending: LessonStatus.IN_REVIEW,
  rejected: LessonStatus.NEEDS_CHANGES,
  // Approval completes the lesson, so this only shows if progress lags.
  approved: LessonStatus.COMPLETED,
};

export function lessonStatus(
  type: LessonType,
  facts: LessonFacts,
): LessonStatus {
  return facts.completed ? LessonStatus.COMPLETED : RESOLVERS[type](facts);
}

/**
 * Where to continue: the first lesson still waiting on the student. A
 * practice under review waits on the teacher, so it is skipped.
 */
export function nextLessonId(
  lessons: { lessonId: string; status: LessonStatus }[],
): string | null {
  const waiting = lessons.find(
    (l) =>
      l.status !== LessonStatus.COMPLETED &&
      l.status !== LessonStatus.IN_REVIEW,
  );
  return waiting?.lessonId ?? null;
}
