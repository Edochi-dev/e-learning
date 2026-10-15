import { Injectable } from '@nestjs/common';
import { NotificationGateway } from '../gateways/notification.gateway';
import { EmailOutboxWriter } from '../gateways/email-outbox-writer.gateway';
import { EmailRenderer } from '../gateways/email-renderer.gateway';
import { EmailNotification } from '../domain/email-content';
import { EmailPriority } from '../domain/email-priority';

/**
 * Implements the app-facing port by queueing: the request that triggered the
 * email never waits on, or fails because of, a mail provider. Renders before
 * queueing, so the outbox holds exactly what gets sent.
 */
@Injectable()
export class OutboxNotificationGateway extends NotificationGateway {
  constructor(
    private readonly outbox: EmailOutboxWriter,
    private readonly renderer: EmailRenderer,
  ) {
    super();
  }

  async sendEmail(
    notification: EmailNotification,
    priority: EmailPriority = EmailPriority.NORMAL,
  ): Promise<void> {
    await this.outbox.enqueue(this.renderer.render(notification), priority);
  }
}
