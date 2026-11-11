import { EmailMessage } from '../domain/email-message';
import { EmailPriority } from '../domain/email-priority';

/** The producer side of the outbox: what the app needs to queue an email. */
export abstract class EmailOutboxWriter {
  abstract enqueue(
    message: EmailMessage,
    priority: EmailPriority,
  ): Promise<void>;
}
