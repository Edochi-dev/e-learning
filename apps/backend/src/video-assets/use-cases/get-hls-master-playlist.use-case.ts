import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HlsPlaylistStore } from '../gateways/hls-playlist-store.gateway';
import { HlsPlaybackTokenService } from '../services/hls-playback-token.service';
import { rewriteMasterPlaylist } from '../services/hls-playlist-rewriter';

@Injectable()
export class GetHlsMasterPlaylistUseCase {
  constructor(
    private readonly playlists: HlsPlaylistStore,
    private readonly tokens: HlsPlaybackTokenService,
  ) {}

  async execute(assetId: string, token: string | undefined): Promise<string> {
    if (!this.tokens.verify(token, assetId)) {
      throw new ForbiddenException('Token de video inválido o expirado');
    }
    const playlist = await this.playlists.readMaster(assetId);
    if (playlist === null) throw new NotFoundException('Video no encontrado');

    return rewriteMasterPlaylist(playlist, token!);
  }
}
