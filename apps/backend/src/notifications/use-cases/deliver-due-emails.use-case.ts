import { Injectable, Logger } from '@nestjs/common';
import { EmailOutboxQueue } from '../gateways/email-outbox-queue.gateway';
import { EmailTransport } from '../gateways/email-transport.gateway';
import { EmailRetryPolicy } from '../domain/email-retry-policy';
import { EmailOutboxMessage } from '../entities/email-outbox-message.entity';

const BATCH_SIZE = 10;

/** Delivers one batch of due outbox emails. Returns how many it claimed. */
@Injectable()
export class DeliverDueEmailsUseCase {
  private readonly logger = new Logger(DeliverDueEmailsUseCase.name);

  constructor(
    private readonly queue: EmailOutboxQueue,
    private readonly transport: EmailTransport,
    private readonly retryPolicy: EmailRetryPolicy,
  ) {}

  async execute(): Promise<number> {
    const batch = await this.queue.claimDue(BATCH_SIZE, new Date());
    // Sequential on purpose: providers rate-limit, and order follows priority.
    for (const email of batch) {
      await this.deliver(email);
    }
    return batch.length;
  }

  private async deliver(email: EmailOutboxMessage): Promise<void> {
    let provider: string;
    try {
      ({ provider } = await this.transport.deliver({
        to: email.recipient,
        subject: email.subject,
        body: email.body,
        textBody: email.textBody,
      }));
    } catch (error) {
      await this.recordFailure(email, error);
      return;
    }
    // Outside the try: if this write fails the email was still sent, and
    // treating it as a delivery failure would send it again.
    await this.queue.markSent(email.id, provider);
  }

  private async recordFailure(
    email: EmailOutboxMessage,
    error: unknown,
  ): Promise<void> {
    const reason = error instanceof Error ? error.message : String(error);
    const decision = this.retryPolicy.decide(email.attempts);
    if (decision.kind === 'retry') {
      await this.queue.scheduleRetry(email.id, decision.nextAttemptAt, reason);
      return;
    }
    this.logger.error(
      `Email ${email.id} descartado tras ${email.attempts} intentos: ${reason}`,
    );
    await this.queue.markFailed(email.id, reason);
  }
}
