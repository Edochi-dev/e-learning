import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SpeechTranscriber } from './gateways/speech-transcriber.gateway';
import { ReviewTranscriptionQueue } from './gateways/review-transcription-queue.gateway';
import { TranscribeNextReviewUseCase } from './use-cases/transcribe-next-review.use-case';

/**
 * Drains pending transcriptions one at a time, sharing the GPU with video
 * encoding. A two-minute audio takes a few seconds.
 */
@Injectable()
export class ReviewTranscriptionWorker implements OnApplicationBootstrap {
  private readonly logger = new Logger(ReviewTranscriptionWorker.name);
  private running = false;

  constructor(
    private readonly transcriber: SpeechTranscriber,
    private readonly queue: ReviewTranscriptionQueue,
    private readonly transcribeNext: TranscribeNextReviewUseCase,
  ) {}

  // Safe only because this is the single worker (one PM2 process).
  async onApplicationBootstrap(): Promise<void> {
    if (!this.transcriber.enabled) return;
    const requeued = await this.queue.requeueInterrupted();
    if (requeued > 0) {
      this.logger.warn(
        `${requeued} transcripción(es) interrumpida(s) vuelven a la cola`,
      );
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async drainQueue(): Promise<void> {
    if (!this.transcriber.enabled || this.running) return;
    this.running = true;
    try {
      while (await this.transcribeNext.execute()) {
        // keep going until the queue is empty
      }
    } finally {
      this.running = false;
    }
  }
}
