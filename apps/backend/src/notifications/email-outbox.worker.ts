import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailOutboxQueue } from './gateways/email-outbox-queue.gateway';
import { DeliverDueEmailsUseCase } from './use-cases/deliver-due-emails.use-case';

/**
 * Drains the email outbox. The short interval bounds how long a password
 * reset waits; an idle tick costs one indexed query.
 */
@Injectable()
export class EmailOutboxWorker implements OnApplicationBootstrap {
  private readonly logger = new Logger(EmailOutboxWorker.name);
  private running = false;

  constructor(
    private readonly queue: EmailOutboxQueue,
    private readonly deliverDue: DeliverDueEmailsUseCase,
  ) {}

  // Safe only while the API runs as a single process: with several, this
  // would requeue emails another process is still sending.
  async onApplicationBootstrap(): Promise<void> {
    const requeued = await this.queue.requeueInterrupted();
    if (requeued > 0) {
      this.logger.warn(
        `${requeued} email(s) interrumpido(s) vuelven a la cola`,
      );
    }
  }

  // Slow SMTP can outlast a tick; the flag keeps ticks from stacking up.
  @Cron(CronExpression.EVERY_10_SECONDS)
  async drainOutbox(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while ((await this.deliverDue.execute()) > 0) {
        // keep going until nothing is due
      }
    } finally {
      this.running = false;
    }
  }
}
