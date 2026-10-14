import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HlsKeyStore } from '../gateways/hls-key-store.gateway';
import { HlsPlaybackTokenService } from '../services/hls-playback-token.service';

@Injectable()
export class GetHlsKeyUseCase {
  constructor(
    private readonly keys: HlsKeyStore,
    private readonly tokens: HlsPlaybackTokenService,
  ) {}

  async execute(assetId: string, token: string | undefined): Promise<Buffer> {
    if (!this.tokens.verify(token, assetId)) {
      throw new ForbiddenException('Token de video inválido o expirado');
    }
    const key = await this.keys.find(assetId);
    if (!key) throw new NotFoundException('Video no encontrado');
    return key;
  }
}
