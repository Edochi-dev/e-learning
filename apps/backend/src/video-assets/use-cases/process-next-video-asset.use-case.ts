import { Injectable, Logger } from '@nestjs/common';
import { VideoAssetGateway } from '../gateways/video-asset.gateway';
import { HlsKeyStore } from '../gateways/hls-key-store.gateway';
import { VideoTranscoder } from '../gateways/video-transcoder.gateway';

const MAX_FAILURE_REASON_LENGTH = 2000;

/** Transcodes the oldest pending asset, if any. Returns whether it found one. */
@Injectable()
export class ProcessNextVideoAssetUseCase {
  private readonly logger = new Logger(ProcessNextVideoAssetUseCase.name);

  constructor(
    private readonly assets: VideoAssetGateway,
    private readonly keys: HlsKeyStore,
    private readonly transcoder: VideoTranscoder,
  ) {}

  async execute(): Promise<boolean> {
    const asset = await this.assets.claimNextPending();
    if (!asset) return false;

    try {
      // A new key on every attempt: a retry re-encrypts every segment anyway.
      const key = await this.keys.issue(asset.id);
      const result = await this.transcoder.transcode({
        assetId: asset.id,
        sourcePath: asset.sourcePath,
        key,
      });
      await this.assets.markReady(asset.id, result);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Asset ${asset.id} falló: ${reason}`);
      await this.assets.markFailed(
        asset.id,
        reason.slice(0, MAX_FAILURE_REASON_LENGTH),
      );
    }
    return true;
  }
}
