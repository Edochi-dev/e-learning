import { Injectable } from '@nestjs/common';
import { VideoAssetGateway } from '../gateways/video-asset.gateway';
import { VideoAsset } from '../entities/video-asset.entity';

/** Queues an already-stored source file for transcoding. */
@Injectable()
export class RegisterVideoAssetUseCase {
  constructor(private readonly assets: VideoAssetGateway) {}

  execute(sourcePath: string): Promise<VideoAsset> {
    return this.assets.create(sourcePath);
  }
}
