import { WATCH_SEGMENTS } from '@maris-nails/shared';

/**
 * Progress is the union of the segments a student actually played across all
 * her sessions, so it adds up over days and devices and seeking never counts.
 * Segment count (WATCH_SEGMENTS) is part of the API contract, hence shared.
 */
export { WATCH_SEGMENTS };

/** Segment indices as the bit string stored in lesson_progress.watchedSegments. */
export function toSegmentBits(segments: number[]): string {
  const bits = new Array<string>(WATCH_SEGMENTS).fill('0');
  for (const s of segments) {
    if (Number.isInteger(s) && s >= 0 && s < WATCH_SEGMENTS) bits[s] = '1';
  }
  return bits.join('');
}
