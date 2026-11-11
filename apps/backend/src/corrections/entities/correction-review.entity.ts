import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { AssignmentSubmission } from './assignment-submission.entity';
import { TranscriptStatus } from '../domain/transcript-status';

export type ReviewDecision = 'approved' | 'rejected';

/**
 * One review of a submission. A submission keeps every review it got, so the
 * student can replay what the teacher said on earlier attempts.
 *
 * Reviews from before audio existed have no audio and carry the old written
 * feedback as their transcript.
 */
@Entity('correction_reviews')
@Index(['submissionId', 'reviewedAt'])
export class CorrectionReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  submissionId: string;

  @Column({ type: 'varchar' })
  decision: ReviewDecision;

  // Internal file name inside the private audio directory; never sent out.
  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  audioFile: string | null;

  @Column({ type: 'int', nullable: true })
  audioDurationSeconds: number | null;

  /** When the audio file gets deleted (see review-audio-policy). */
  @Column({ type: 'timestamptz', nullable: true })
  audioExpiresAt: Date | null;

  @Column({ type: 'text', nullable: true })
  transcript: string | null;

  @Column({ type: 'varchar', default: TranscriptStatus.PENDING })
  transcriptStatus: TranscriptStatus;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  reviewedAt: Date;

  @ManyToOne(() => AssignmentSubmission, (s) => s.reviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submissionId' })
  submission: AssignmentSubmission;

  @Expose()
  get hasAudio(): boolean {
    return this.audioFile !== null;
  }
}
