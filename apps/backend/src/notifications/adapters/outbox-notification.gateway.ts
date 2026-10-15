import { Injectable } from '@nestjs/common';
import { NotificationGateway } from '../gateways/notification.gateway';
import { EmailOutboxWriter } from '../gateways/email-outbox-writer.gateway';
import { EmailMessage } from '../domain/email-message';
import { EmailPriority } from '../domain/email-priority';

/**
 * Implements the app-facing port by queueing: the request that triggered the
 * email never waits on, or fails because of, a mail provider.
 */
@Injectable()
export class OutboxNotificationGateway extends NotificationGateway {
  constructor(private readonly outbox: EmailOutboxWriter) {
    super();
  }

  async sendEmail(
    message: EmailMessage,
    priority: EmailPriority = EmailPriority.NORMAL,
  ): Promise<void> {
    await this.outbox.enqueue(message, priority);
  }
}
