import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { VideoAssetKey } from './entities/video-asset-key.entity';
import { HlsKeyStore } from './gateways/hls-key-store.gateway';

const AES_128_KEY_BYTES = 16;

@Injectable()
export class VideoAssetKeysRepository implements HlsKeyStore {
  constructor(
    @InjectRepository(VideoAssetKey)
    private readonly repo: Repository<VideoAssetKey>,
  ) {}

  async issue(assetId: string): Promise<Buffer> {
    const key = randomBytes(AES_128_KEY_BYTES);
    await this.repo.upsert({ assetId, key }, ['assetId']);
    return key;
  }

  async find(assetId: string): Promise<Buffer | null> {
    const row = await this.repo.findOne({ where: { assetId } });
    return row?.key ?? null;
  }
}
