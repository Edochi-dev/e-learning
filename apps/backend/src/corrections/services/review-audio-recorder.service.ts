import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AudioNormalizer,
  InvalidAudioError,
} from '../gateways/audio-normalizer.gateway';
import { CorrectionAudioStore } from '../gateways/correction-audio-store.gateway';
import {
  isAcceptableDuration,
  MAX_REVIEW_AUDIO_SECONDS,
} from '../domain/review-audio-policy';

export interface StoredReviewAudio {
  audioFile: string;
  durationSeconds: number;
}

/** Normalizes, validates and stores the audio of one review. */
@Injectable()
export class ReviewAudioRecorder {
  constructor(
    private readonly normalizer: AudioNormalizer,
    private readonly audioStore: CorrectionAudioStore,
  ) {}

  async store(reviewId: string, recording: Buffer): Promise<StoredReviewAudio> {
    let normalized;
    try {
      normalized = await this.normalizer.normalize(recording);
    } catch (error) {
      if (error instanceof InvalidAudioError) {
        throw new BadRequestException(
          'No pudimos leer el audio. Grábalo de nuevo.',
        );
      }
      throw error;
    }
    if (!isAcceptableDuration(normalized.durationSeconds)) {
      throw new BadRequestException(
        `El audio debe durar entre 1 segundo y ${MAX_REVIEW_AUDIO_SECONDS / 60} minutos.`,
      );
    }
    return {
      audioFile: await this.audioStore.save(reviewId, normalized.data),
      durationSeconds: Math.round(normalized.durationSeconds),
    };
  }

  discard(audioFile: string): Promise<void> {
    return this.audioStore.delete(audioFile);
  }
}
