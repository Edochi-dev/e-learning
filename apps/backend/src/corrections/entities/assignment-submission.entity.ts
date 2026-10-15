import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  OneToMany,
  Unique,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Lesson } from '../../courses/entities/lessons.entity';
import { CorrectionReview } from './correction-review.entity';

/**
 * A student's submission for a correction lesson: one row per (student,
 * lesson). A re-submission updates the photo and goes back to 'pending'; each
 * review is kept as its own CorrectionReview, so the history survives.
 *
 * Status: pending → approved | rejected; rejected → pending on re-submission.
 */
@Entity('assignment_submissions')
@Unique(['studentId', 'lessonId'])
export class AssignmentSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  lessonId: string;

  @Column()
  photoUrl: string;

  @Column({ default: 'pending' })
  status: string;

  @CreateDateColumn()
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  // ── Relaciones ──────────────────────────────────────────────────────

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  /** Newest first when loaded through the repository. */
  @OneToMany(() => CorrectionReview, (review) => review.submission)
  reviews: CorrectionReview[];
}
