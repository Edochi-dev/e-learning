import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoAsset } from './entities/video-asset.entity';
import { VideoAssetStatus } from './domain/video-asset-status';
import {
  TranscodeResult,
  VideoAssetGateway,
} from './gateways/video-asset.gateway';

@Injectable()
export class VideoAssetsRepository implements VideoAssetGateway {
  constructor(
    @InjectRepository(VideoAsset)
    private readonly repo: Repository<VideoAsset>,
  ) {}

  async create(sourcePath: string): Promise<VideoAsset> {
    return this.repo.save(this.repo.create({ sourcePath }));
  }

  async findById(id: string): Promise<VideoAsset | null> {
    return this.repo.findOne({ where: { id } });
  }

  // SKIP LOCKED: a second worker skips the row the first one is claiming
  // instead of waiting for it and then claiming it again.
  async claimNextPending(): Promise<VideoAsset | null> {
    const [rows]: [VideoAsset[], number] = await this.repo.query(
      `UPDATE "video_assets"
          SET "status" = $1, "processingStartedAt" = now(), "updatedAt" = now()
        WHERE "id" = (
          SELECT "id" FROM "video_assets"
           WHERE "status" = $2
           ORDER BY "createdAt"
           LIMIT 1
           FOR UPDATE SKIP LOCKED
        )
        RETURNING "id"`,
      [VideoAssetStatus.PROCESSING, VideoAssetStatus.PENDING],
    );
    return rows.length > 0 ? this.findById(rows[0].id) : null;
  }

  async markReady(id: string, result: TranscodeResult): Promise<void> {
    await this.repo.update(id, {
      status: VideoAssetStatus.READY,
      durationSeconds: result.durationSeconds,
      renditions: result.renditions,
      failureReason: null,
      readyAt: new Date(),
    });
  }

  async markFailed(id: string, reason: string): Promise<void> {
    await this.repo.update(id, {
      status: VideoAssetStatus.FAILED,
      failureReason: reason,
    });
  }

  async requeueInterrupted(): Promise<number> {
    const result = await this.repo.update(
      { status: VideoAssetStatus.PROCESSING },
      { status: VideoAssetStatus.PENDING, processingStartedAt: null },
    );
    return result.affected ?? 0;
  }
}
