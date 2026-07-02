import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PushSubscriptionGateway } from './gateways/push-subscription.gateway';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * PushService — Envía notificaciones web-push a las suscripciones guardadas.
 *
 * Si no hay claves VAPID en el entorno, queda desactivado silenciosamente
 * (isConfigured() = false) y no rompe nada — igual que el fallback de SMTP.
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private configured = false;

  constructor(
    private readonly config: ConfigService,
    private readonly gateway: PushSubscriptionGateway,
  ) {}

  onModuleInit(): void {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject =
      this.config.get<string>('VAPID_SUBJECT') ||
      'mailto:admin@marisnails.academy';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.configured = true;
    } else {
      this.logger.warn(
        'VAPID keys no configuradas: las notificaciones push están desactivadas.',
      );
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getPublicKey(): string | null {
    return this.config.get<string>('VAPID_PUBLIC_KEY') ?? null;
  }

  /** Difunde un aviso a todas las suscripciones; limpia las muertas (404/410). */
  async sendToAll(payload: PushPayload): Promise<void> {
    if (!this.configured) return;

    const subs = await this.gateway.findAll();
    const data = JSON.stringify(payload);

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            data,
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.gateway.deleteByEndpoint(s.endpoint);
          } else {
            this.logger.warn(
              `Push falló para una suscripción: ${(err as Error)?.message}`,
            );
          }
        }
      }),
    );
  }
}
