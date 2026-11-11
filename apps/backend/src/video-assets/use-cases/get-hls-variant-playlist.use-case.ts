import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HlsPlaylistStore } from '../gateways/hls-playlist-store.gateway';
import { HlsMediaUrlSigner } from '../gateways/hls-media-url-signer.gateway';
import { HlsPlaybackTokenService } from '../services/hls-playback-token.service';
import { rewriteVariantPlaylist } from '../services/hls-playlist-rewriter';

@Injectable()
export class GetHlsVariantPlaylistUseCase {
  constructor(
    private readonly playlists: HlsPlaylistStore,
    private readonly signer: HlsMediaUrlSigner,
    private readonly tokens: HlsPlaybackTokenService,
  ) {}

  async execute(
    assetId: string,
    rendition: string,
    token: string | undefined,
  ): Promise<string> {
    const grant = this.tokens.verify(token, assetId);
    if (!grant) {
      throw new ForbiddenException('Token de video inválido o expirado');
    }
    const playlist = await this.playlists.readVariant(assetId, rendition);
    if (playlist === null) throw new NotFoundException('Video no encontrado');

    return rewriteVariantPlaylist(playlist, {
      // The variant lives at /hls/:assetId/:rendition/index.m3u8.
      keyUri: `../key?token=${encodeURIComponent(token!)}`,
      segmentUrl: (segment) =>
        this.signer.signSegmentUrl(
          { assetId, rendition, segment },
          grant.expiresAt,
        ),
    });
  }
}
