import { EmailNotification } from '../domain/email-content';
import { EmailMessage } from '../domain/email-message';

/** Turns email content into the final message (layout, branding, text part). */
export abstract class EmailRenderer {
  abstract render(notification: EmailNotification): EmailMessage;
}
