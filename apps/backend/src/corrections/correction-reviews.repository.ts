import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import { CorrectionReview } from './entities/correction-review.entity';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import {
  CorrectionReviewGateway,
  NewCorrectionReview,
} from './gateways/correction-review.gateway';
import {
  ReviewTranscriptionQueue,
  TranscriptionJob,
} from './gateways/review-transcription-queue.gateway';
import {
  ExpiredAudio,
  ExpiredReviewAudioGateway,
} from './gateways/expired-review-audio.gateway';
import { TranscriptStatus } from './domain/transcript-status';

@Injectable()
export class CorrectionReviewsRepository
  implements
    CorrectionReviewGateway,
    ReviewTranscriptionQueue,
    ExpiredReviewAudioGateway
{
  constructor(
    @InjectRepository(CorrectionReview)
    private readonly repo: Repository<CorrectionReview>,
  ) {}

  async record(review: NewCorrectionReview): Promise<CorrectionReview> {
    return this.repo.manager.transaction(async (manager) => {
      const saved = await manager.save(
        manager.create(CorrectionReview, review),
      );
      await manager.update(AssignmentSubmission, review.submissionId, {
        status: review.decision,
        reviewedAt: review.reviewedAt,
      });
      return saved;
    });
  }

  async findWithSubmission(id: string): Promise<CorrectionReview | null> {
    return this.repo.findOne({ where: { id }, relations: ['submission'] });
  }

  // One statement, so two workers could never claim the same review.
  async claimNext(): Promise<TranscriptionJob | null> {
    const [rows]: [{ id: string; audioFile: string }[], number] =
      await this.repo.query(
        `UPDATE "correction_reviews" SET "transcriptStatus" = $1
       WHERE "id" = (
         SELECT "id" FROM "correction_reviews"
         WHERE "transcriptStatus" = $2 AND "audioFile" IS NOT NULL
         ORDER BY "reviewedAt"
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING "id", "audioFile"`,
        [TranscriptStatus.PROCESSING, TranscriptStatus.PENDING],
      );
    const [row] = rows;
    return row ? { reviewId: row.id, audioFile: row.audioFile } : null;
  }

  async markTranscribed(reviewId: string, transcript: string): Promise<void> {
    await this.repo.update(reviewId, {
      transcript,
      transcriptStatus: TranscriptStatus.DONE,
    });
  }

  async markFailed(reviewId: string): Promise<void> {
    await this.repo.update(reviewId, {
      transcriptStatus: TranscriptStatus.FAILED,
    });
  }

  async requeueInterrupted(): Promise<number> {
    const result = await this.repo.update(
      { transcriptStatus: TranscriptStatus.PROCESSING },
      { transcriptStatus: TranscriptStatus.PENDING },
    );
    return result.affected ?? 0;
  }

  async findExpired(now: Date, limit: number): Promise<ExpiredAudio[]> {
    const rows = await this.repo.find({
      select: { id: true, audioFile: true },
      where: {
        audioFile: Not(IsNull()),
        audioExpiresAt: LessThanOrEqual(now),
        // A review still being transcribed keeps its file until it finishes.
        transcriptStatus: Not(TranscriptStatus.PROCESSING),
      },
      order: { audioExpiresAt: 'ASC' },
      take: limit,
    });
    return rows.map((row) => ({
      reviewId: row.id,
      audioFile: row.audioFile as string,
    }));
  }

  async clearAudio(reviewId: string): Promise<void> {
    await this.repo.update(reviewId, { audioFile: null });
  }
}
