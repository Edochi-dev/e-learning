import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { VideoAsset } from './video-asset.entity';

/**
 * AES-128 key of an asset's segments, in its own table so that no ordinary
 * asset query can return it by accident. Living in Postgres also puts it in
 * the nightly pg_dump: losing a key makes that video unplayable forever.
 */
@Entity('video_asset_keys')
export class VideoAssetKey {
  @PrimaryColumn('uuid')
  assetId: string;

  @Column({ type: 'bytea' })
  key: Buffer;

  @OneToOne(() => VideoAsset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assetId' })
  asset: VideoAsset;
}
