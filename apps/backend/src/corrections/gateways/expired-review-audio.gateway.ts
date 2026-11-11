export interface ExpiredAudio {
  reviewId: string;
  audioFile: string;
}

/** Reviews whose audio has outlived its retention, for the purge job. */
export abstract class ExpiredReviewAudioGateway {
  abstract findExpired(now: Date, limit: number): Promise<ExpiredAudio[]>;

  /** Drops the file reference; the review and its transcript stay. */
  abstract clearAudio(reviewId: string): Promise<void>;
}
