import { TranscodeResult } from './video-asset.gateway';

export interface TranscodeRequest {
  assetId: string;
  sourcePath: string;
  key: Buffer;
}

export abstract class VideoTranscoder {
  /**
   * Produces the encrypted HLS output of the asset. Either the whole output
   * becomes visible or none of it does; on failure it throws.
   */
  abstract transcode(request: TranscodeRequest): Promise<TranscodeResult>;
}
