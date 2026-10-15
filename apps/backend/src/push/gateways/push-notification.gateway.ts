export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Broadcasts a web-push notice to every subscribed device (today only admins
 * can subscribe). Best effort: a dead or failing device never throws, and with
 * no VAPID keys it is a no-op.
 */
export abstract class PushNotificationGateway {
  abstract sendToAll(payload: PushPayload): Promise<void>;
}
