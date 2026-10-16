import {
  CorrectionReview,
  ReviewDecision,
} from '../entities/correction-review.entity';
import { TranscriptStatus } from '../domain/transcript-status';

export interface NewCorrectionReview {
  /** Chosen by the caller: the audio file is named after it before insert. */
  id: string;
  submissionId: string;
  decision: ReviewDecision;
  audioFile: string;
  audioDurationSeconds: number;
  audioExpiresAt: Date;
  transcriptStatus: TranscriptStatus;
  reviewedAt: Date;
}

/** Persistence of reviews as the review flow and the audio endpoint need them. */
export abstract class CorrectionReviewGateway {
  /**
   * Inserts the review and moves its submission to the review's decision in
   * one transaction: a submission never ends up reviewed without its review.
   */
  abstract record(review: NewCorrectionReview): Promise<CorrectionReview>;

  /** With its submission loaded, for the ownership check. */
  abstract findWithSubmission(id: string): Promise<CorrectionReview | null>;
}
