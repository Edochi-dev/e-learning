import { EmailOutboxMessage } from '../entities/email-outbox-message.entity';

/** The consumer side of the outbox: what the delivery worker needs. */
export abstract class EmailOutboxQueue {
  /**
   * Atomically moves up to `limit` PENDING rows due at `now` to SENDING,
   * increments their attempts and returns them by priority, then age. Two
   * concurrent callers never receive the same row.
   */
  abstract claimDue(limit: number, now: Date): Promise<EmailOutboxMessage[]>;

  abstract markSent(id: string, provider: string): Promise<void>;

  abstract scheduleRetry(
    id: string,
    nextAttemptAt: Date,
    error: string,
  ): Promise<void>;

  abstract markFailed(id: string, error: string): Promise<void>;

  /** Puts back to PENDING the rows a crash or restart left in SENDING. */
  abstract requeueInterrupted(): Promise<number>;
}
