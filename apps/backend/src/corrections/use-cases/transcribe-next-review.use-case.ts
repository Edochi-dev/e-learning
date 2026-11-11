import { Injectable, Logger } from '@nestjs/common';
import { ReviewTranscriptionQueue } from '../gateways/review-transcription-queue.gateway';
import { SpeechTranscriber } from '../gateways/speech-transcriber.gateway';
import { CorrectionAudioStore } from '../gateways/correction-audio-store.gateway';

/** Transcribes the oldest pending review. Returns false when none is waiting. */
@Injectable()
export class TranscribeNextReviewUseCase {
  private readonly logger = new Logger(TranscribeNextReviewUseCase.name);

  constructor(
    private readonly queue: ReviewTranscriptionQueue,
    private readonly transcriber: SpeechTranscriber,
    private readonly store: CorrectionAudioStore,
  ) {}

  async execute(): Promise<boolean> {
    const job = await this.queue.claimNext();
    if (!job) return false;

    try {
      const transcript = await this.transcriber.transcribe(
        this.store.localPath(job.audioFile),
      );
      await this.queue.markTranscribed(job.reviewId, transcript);
    } catch (error) {
      // Not retried: the audio is what matters, the transcript is a convenience.
      this.logger.error(
        `No se pudo transcribir la revisión ${job.reviewId}: ${(error as Error).message}`,
      );
      await this.queue.markFailed(job.reviewId);
    }
    return true;
  }
}
