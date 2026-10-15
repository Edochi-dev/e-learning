import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EmailOutboxStatus } from '../domain/email-outbox-status';
import { EmailPriority } from '../domain/email-priority';

/**
 * An email accepted by the app and waiting for (or done with) delivery.
 * Persisting before sending means a provider outage delays an email instead
 * of losing it.
 */
@Entity('email_outbox')
@Index('IDX_email_outbox_pending', ['priority', 'createdAt'], {
  where: `"status" = 'pending'`,
})
export class EmailOutboxMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  recipient: string;

  @Column({ type: 'varchar' })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  textBody: string | null;

  @Column({ type: 'smallint', default: EmailPriority.NORMAL })
  priority: EmailPriority;

  @Column({ type: 'varchar', default: EmailOutboxStatus.PENDING })
  status: EmailOutboxStatus;

  /** Incremented when a row is claimed, so a crash mid-send still counts. */
  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  nextAttemptAt: Date;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  /** Name of the transport that accepted the email (the SMTP host). */
  @Column({ type: 'varchar', nullable: true })
  provider: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
