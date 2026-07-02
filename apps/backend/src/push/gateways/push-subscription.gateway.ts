import { PushSubscription } from '../entities/push-subscription.entity';

export interface UpsertPushSubscriptionData {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * PushSubscriptionGateway — Contrato de persistencia de las suscripciones push.
 */
export abstract class PushSubscriptionGateway {
  /** Crea o actualiza la suscripción según su endpoint (único). */
  abstract upsert(data: UpsertPushSubscriptionData): Promise<void>;

  /** Todas las suscripciones (para difundir un aviso). */
  abstract findAll(): Promise<PushSubscription[]>;

  /** Borra una suscripción por endpoint (al desuscribir o si queda muerta). */
  abstract deleteByEndpoint(endpoint: string): Promise<void>;
}
