import { Injectable } from '@nestjs/common';
import { PendingCorrectionsGateway } from '../gateways/pending-corrections.gateway';
import { AlertRecipientsGateway } from '../../users/gateways/alert-recipients.gateway';
import { AlertTopic } from '../../users/domain/alert-topic';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';
import { EmailPriority } from '../../notifications/domain/email-priority';
import { html } from '../../notifications/templates/safe-html';

/**
 * Emails the teacher a nudge when submissions are waiting for review. Push
 * already announces each submission as it arrives; this is the safety net for
 * a missed push, so it sends nothing when the backlog is empty.
 */
@Injectable()
export class RemindPendingCorrectionsUseCase {
  constructor(
    private readonly pending: PendingCorrectionsGateway,
    private readonly alertRecipients: AlertRecipientsGateway,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async execute(): Promise<void> {
    const count = await this.pending.countPending();
    if (count === 0) return;

    const recipients = await this.alertRecipients.findEmailsFor(
      AlertTopic.PENDING_CORRECTIONS,
    );
    if (recipients.length === 0) return;

    const subject =
      count === 1
        ? 'Tienes 1 corrección por revisar'
        : `Tienes ${count} correcciones por revisar`;
    const content = {
      heading: subject,
      body:
        count === 1
          ? html`<p>Una alumna está esperando tu revisión.</p>`
          : html`<p>Hay ${count} entregas esperando tu revisión.</p>`,
      action: { label: 'Revisar correcciones', path: '/admin/correcciones' },
    };

    for (const to of recipients) {
      await this.notificationGateway.sendEmail(
        { to, subject, content },
        EmailPriority.LOW,
      );
    }
  }
}
