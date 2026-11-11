import { VideoAsset } from '../entities/video-asset.entity';

export interface TranscodeResult {
  durationSeconds: number;
  renditions: string[];
}

export abstract class VideoAssetGateway {
  abstract create(sourcePath: string): Promise<VideoAsset>;

  abstract findById(id: string): Promise<VideoAsset | null>;

  /**
   * Atomically moves the oldest PENDING asset to PROCESSING and returns it,
   * or null if there is none. Two workers can never claim the same asset.
   */
  abstract claimNextPending(): Promise<VideoAsset | null>;

  abstract markReady(id: string, result: TranscodeResult): Promise<void>;

  abstract markFailed(id: string, reason: string): Promise<void>;

  /** Puts back to PENDING the assets a crash or restart left half-done. */
  abstract requeueInterrupted(): Promise<number>;
}
