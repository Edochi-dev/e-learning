import { Readable } from 'stream';

/** Private storage for review audio. Files are never reachable by URL. */
export abstract class CorrectionAudioStore {
  /** Stores the normalized audio and returns the file name to persist. */
  abstract save(reviewId: string, data: Buffer): Promise<string>;

  abstract open(audioFile: string): Promise<{ stream: Readable; size: number }>;

  /** Absolute path, for tools that read the file directly (transcription). */
  abstract localPath(audioFile: string): string;

  /** No-op when the file is already gone. */
  abstract delete(audioFile: string): Promise<void>;
}
