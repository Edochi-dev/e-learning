import { Injectable, NotFoundException } from '@nestjs/common';
import { VideoAssetGateway } from '../gateways/video-asset.gateway';
import { VideoAssetStatus } from '../domain/video-asset-status';
import { HlsPlaybackTokenService } from '../services/hls-playback-token.service';
import { HlsConfig } from '../hls.config';

export interface HlsPlayback {
  /** Relative to the API root, like the legacy signed stream URL. */
  url: string;
  expires: number;
}

/**
 * Authorization is the caller's job: whoever exposes this must have checked
 * the enrollment first (EnrollmentGuard), exactly as with signed-url today.
 */
@Injectable()
export class IssueHlsPlaybackUseCase {
  constructor(
    private readonly assets: VideoAssetGateway,
    private readonly tokens: HlsPlaybackTokenService,
    private readonly config: HlsConfig,
  ) {}

  async execute(assetId: string, userId: string): Promise<HlsPlayback> {
    const asset = await this.assets.findById(assetId);
    if (asset?.status !== VideoAssetStatus.READY) {
      throw new NotFoundException('El video no está disponible');
    }

    // The segment URLs inherit this expiry, so it must outlast the video:
    // a short TTL alone would cut off a long class halfway through.
    const ttlMs =
      (this.config.tokenTtlSeconds + (asset.durationSeconds ?? 0)) * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);
    const token = this.tokens.issue(asset.id, userId, expiresAt);

    return {
      url: `/hls/${asset.id}/master.m3u8?token=${encodeURIComponent(token)}`,
      expires: expiresAt.getTime(),
    };
  }
}
