import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Readable } from 'stream';
import { UserRole } from '@maris-nails/shared';
import { CorrectionReviewGateway } from '../gateways/correction-review.gateway';
import { CorrectionAudioStore } from '../gateways/correction-audio-store.gateway';
import { REVIEW_AUDIO_CONTENT_TYPE } from '../gateways/audio-normalizer.gateway';

export interface ReviewAudioRequester {
  id: string;
  role: string;
}

export interface ReviewAudio {
  stream: Readable;
  size: number;
  contentType: string;
}

/**
 * Streams a review's audio to the student it belongs to, or to an admin.
 * Anyone else gets 404, not 403, so review ids cannot be probed.
 */
@Injectable()
export class GetReviewAudioUseCase {
  constructor(
    private readonly reviews: CorrectionReviewGateway,
    private readonly store: CorrectionAudioStore,
  ) {}

  async execute(
    reviewId: string,
    requester: ReviewAudioRequester,
  ): Promise<ReviewAudio> {
    const review = await this.reviews.findWithSubmission(reviewId);
    const isOwner = review?.submission.studentId === requester.id;
    if (!review || !(isOwner || requester.role === UserRole.ADMIN)) {
      throw new NotFoundException('Audio no encontrado');
    }
    if (!review.audioFile) {
      throw new ForbiddenException('Este audio ya no está disponible');
    }
    const { stream, size } = await this.store.open(review.audioFile);
    return { stream, size, contentType: REVIEW_AUDIO_CONTENT_TYPE };
  }
}
