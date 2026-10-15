import {
  audioExpiry,
  isAcceptableDuration,
  OPEN_ENDED_AUDIO_RETENTION_DAYS,
} from './review-audio-policy';

describe('review audio policy', () => {
  const reviewedAt = new Date('2026-10-15T12:00:00Z');

  it('expires with the enrollment when the course has an end date', () => {
    const enrollmentEnd = new Date('2027-01-31T00:00:00Z');
    expect(audioExpiry(reviewedAt, enrollmentEnd)).toEqual(enrollmentEnd);
  });

  it('keeps it a fixed window after the review when access never expires', () => {
    const expected = new Date(reviewedAt);
    expected.setUTCDate(
      expected.getUTCDate() + OPEN_ENDED_AUDIO_RETENTION_DAYS,
    );
    expect(audioExpiry(reviewedAt, null)).toEqual(expected);
  });

  it('accepts up to two minutes, with a little encoder slack', () => {
    expect(isAcceptableDuration(0)).toBe(false);
    expect(isAcceptableDuration(45)).toBe(true);
    expect(isAcceptableDuration(121.5)).toBe(true);
    expect(isAcceptableDuration(125)).toBe(false);
  });
});
