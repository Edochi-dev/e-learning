import { EmailNotification } from '../domain/email-content';
import { EmailPriority } from '../domain/email-priority';

/**
 * App-facing notification port. Feature modules depend only on this and never
 * learn whether the email is queued, sent by SMTP or printed to the console.
 */
export abstract class NotificationGateway {
  /**
   * Accepts the email for delivery. Resolving means it will be delivered, not
   * that it already was: delivery happens out of the request, with retries.
   * Throws only if the email could not be accepted at all.
   */
  abstract sendEmail(
    notification: EmailNotification,
    priority?: EmailPriority,
  ): Promise<void>;
}
