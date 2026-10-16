export interface TranscriptionJob {
  reviewId: string;
  audioFile: string;
}

/** The transcription worker's view of reviews waiting for a transcript. */
export abstract class ReviewTranscriptionQueue {
  /** Atomically takes the oldest pending review; null when none is waiting. */
  abstract claimNext(): Promise<TranscriptionJob | null>;

  abstract markTranscribed(reviewId: string, transcript: string): Promise<void>;

  abstract markFailed(reviewId: string): Promise<void>;

  /** Puts back to pending the reviews a crash or restart left half-done. */
  abstract requeueInterrupted(): Promise<number>;

  /**
   * Queues the reviews recorded while transcription was off, as long as their
   * audio still exists.
   */
  abstract queueUntranscribed(): Promise<number>;
}
