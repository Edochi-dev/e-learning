export interface NormalizedAudio {
  data: Buffer;
  durationSeconds: number;
}

/** Content type of every stored review audio (AAC in an MP4 container). */
export const REVIEW_AUDIO_CONTENT_TYPE = 'audio/mp4';

/**
 * Converts whatever the browser recorded (WebM/Opus on Android, MP4/AAC on
 * iPhone) into one format every phone can play.
 */
export abstract class AudioNormalizer {
  /** Throws InvalidAudioError when the input holds no decodable audio. */
  abstract normalize(input: Buffer): Promise<NormalizedAudio>;
}

export class InvalidAudioError extends Error {}
