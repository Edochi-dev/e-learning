import { AlertTopic } from '../domain/alert-topic';

/**
 * Who gets an email alert on a given topic (pending corrections, name change
 * requests, …). Kept apart from UserGateway so feature modules get "who to
 * notify" without access to the full user store.
 */
export abstract class AlertRecipientsGateway {
  abstract findEmailsFor(topic: AlertTopic): Promise<string[]>;
}
