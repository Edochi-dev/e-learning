import { Injectable } from '@nestjs/common';
import { ExpiredReviewAudioGateway } from '../gateways/expired-review-audio.gateway';
import { CorrectionAudioStore } from '../gateways/correction-audio-store.gateway';

const BATCH_SIZE = 100;

/**
 * Deletes the audio files whose retention ended (see review-audio-policy).
 * The reviews and their transcripts stay. Returns how many were deleted.
 */
@Injectable()
export class PurgeExpiredReviewAudioUseCase {
  constructor(
    private readonly expired: ExpiredReviewAudioGateway,
    private readonly store: CorrectionAudioStore,
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    let purged = 0;
    for (;;) {
      const batch = await this.expired.findExpired(now, BATCH_SIZE);
      for (const { reviewId, audioFile } of batch) {
        // File first: if clearing the row fails, the next run retries both.
        await this.store.delete(audioFile);
        await this.expired.clearAudio(reviewId);
      }
      purged += batch.length;
      if (batch.length < BATCH_SIZE) return purged;
    }
  }
}
