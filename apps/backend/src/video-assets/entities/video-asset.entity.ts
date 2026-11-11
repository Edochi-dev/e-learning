import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { VideoAssetStatus } from '../domain/video-asset-status';

/**
 * A video uploaded once and transcoded to encrypted HLS. Lessons will point at
 * an asset instead of at a file, so the same recording can back several
 * lessons and be re-encoded without touching them.
 */
@Entity('video_assets')
export class VideoAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', default: VideoAssetStatus.PENDING })
  status: VideoAssetStatus;

  /** Relative to HLS_SOURCE_DIR. The original is kept to allow re-encoding. */
  @Column()
  sourcePath: string;

  @Column({ type: 'int', nullable: true })
  durationSeconds: number | null;

  @Column({ type: 'simple-array', nullable: true })
  renditions: string[] | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  processingStartedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  readyAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
