import { EmailMessage } from '../domain/email-message';

export interface DeliveryReceipt {
  /** Which transport accepted the email. */
  provider: string;
}

/**
 * Hands one email to a mail provider, synchronously. Only the outbox worker
 * uses it; the rest of the app goes through NotificationGateway.
 */
export abstract class EmailTransport {
  abstract readonly name: string;

  /** Throws if the provider did not accept the email. */
  abstract deliver(message: EmailMessage): Promise<DeliveryReceipt>;
}
