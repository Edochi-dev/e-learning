import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PurgeExpiredReviewAudioUseCase } from './use-cases/purge-expired-review-audio.use-case';

@Injectable()
export class ReviewAudioRetentionCron {
  private readonly logger = new Logger(ReviewAudioRetentionCron.name);

  constructor(private readonly purge: PurgeExpiredReviewAudioUseCase) {}

  @Cron('30 4 * * *', { timeZone: 'America/Santiago' })
  async run(): Promise<void> {
    const purged = await this.purge.execute();
    if (purged > 0) {
      this.logger.log(`${purged} audio(s) de corrección vencido(s) borrado(s)`);
    }
  }
}
