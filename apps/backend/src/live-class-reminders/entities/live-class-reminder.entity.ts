import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Lesson } from '../../courses/entities/lessons.entity';
import { User } from '../../users/entities/user.entity';

/**
 * A reminder already sent: one student, one live class, at the start time it
 * announced. The start time is part of the key, so a rescheduled class is
 * announced again for its new time.
 */
@Entity('live_class_reminders')
export class LiveClassReminder {
  @PrimaryColumn('uuid')
  lessonId: string;

  @PrimaryColumn('uuid')
  userId: string;

  @PrimaryColumn('timestamptz')
  startsAt: Date;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn({ type: 'timestamptz' })
  sentAt: Date;
}
