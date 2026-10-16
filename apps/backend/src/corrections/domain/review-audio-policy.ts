/** Longest recording accepted, plus slack for encoder padding. */
export const MAX_REVIEW_AUDIO_SECONDS = 120;
const DURATION_TOLERANCE_SECONDS = 2;

/** Kept this long when the student's access never expires. */
export const OPEN_ENDED_AUDIO_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isAcceptableDuration(seconds: number): boolean {
  return (
    seconds > 0 &&
    seconds <= MAX_REVIEW_AUDIO_SECONDS + DURATION_TOLERANCE_SECONDS
  );
}

/**
 * When a review's audio file is deleted: when the student's access ends, or a
 * fixed window after the review for courses without expiry. The transcript is
 * kept either way.
 */
export function audioExpiry(
  reviewedAt: Date,
  enrollmentExpiresAt: Date | null,
): Date {
  return (
    enrollmentExpiresAt ??
    new Date(reviewedAt.getTime() + OPEN_ENDED_AUDIO_RETENTION_DAYS * DAY_MS)
  );
}
