import { Logger } from '@nestjs/common';
import { EmailMessage } from '../domain/email-message';
import {
  DeliveryReceipt,
  EmailTransport,
} from '../gateways/email-transport.gateway';

const BODY_PREVIEW_LENGTH = 200;

/**
 * Logs the email instead of sending it. Used when no SMTP is configured, so a
 * fresh clone runs without credentials and never mails anyone by accident.
 */
export class ConsoleEmailTransport extends EmailTransport {
  readonly name = 'console';
  private readonly logger = new Logger(ConsoleEmailTransport.name);

  deliver(message: EmailMessage): Promise<DeliveryReceipt> {
    this.logger.log(
      [
        '',
        '┌─ EMAIL (no enviado, modo Console) ─────────────────────',
        `│ To:      ${message.to}`,
        `│ Subject: ${message.subject}`,
        `│ Body:    ${previewBody(message.body)}`,
        '└────────────────────────────────────────────────────────',
      ].join('\n'),
    );
    return Promise.resolve({ provider: this.name });
  }
}

function previewBody(body: string): string {
  const collapsed = body.replace(/\s+/g, ' ').trim();
  return collapsed.length > BODY_PREVIEW_LENGTH
    ? collapsed.slice(0, BODY_PREVIEW_LENGTH) + '… [truncado]'
    : collapsed;
}
