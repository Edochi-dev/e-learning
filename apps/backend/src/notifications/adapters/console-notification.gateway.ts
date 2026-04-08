import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationGateway,
  EmailMessage,
} from '../gateways/notification.gateway';

/**
 * ConsoleNotificationGateway — Adapter que NO envía emails reales.
 *
 * En su lugar, imprime el mensaje en stdout usando el Logger de Nest.
 * Es la implementación por defecto cuando no hay credenciales SMTP
 * configuradas en el .env, así que el backend nunca arranca intentando
 * conectarse a un SMTP que no existe.
 *
 * Casos de uso:
 *   - Desarrollo local sin credenciales reales (cuando no quieres
 *     mandar emails de prueba a alguien por accidente).
 *   - Tests automatizados (verificas el contenido sin tocar red).
 *   - Onboarding de nuevos contributors al repo: clonan, no
 *     configuran SMTP, todo arranca y funciona en modo "ver pero
 *     no enviar".
 *
 * Clean Architecture nota: este adapter implementa el MISMO contrato
 * que SmtpNotificationGateway. Para los use cases que inyectan
 * NotificationGateway, no hay diferencia — esa es la promesa de los
 * puertos y adaptadores.
 */
@Injectable()
export class ConsoleNotificationGateway extends NotificationGateway {
  private readonly logger = new Logger(ConsoleNotificationGateway.name);

  async sendEmail(message: EmailMessage): Promise<void> {
    // Loguear con un formato legible para que la salida del backend
    // en desarrollo muestre los emails de manera obvia.
    this.logger.log(
      [
        '',
        '┌─ EMAIL (no enviado, modo Console) ─────────────────────',
        `│ To:      ${message.to}`,
        `│ Subject: ${message.subject}`,
        `│ Body:    ${this.previewBody(message.body)}`,
        '└────────────────────────────────────────────────────────',
      ].join('\n'),
    );
    return Promise.resolve();
  }

  /**
   * Recorta el body si es muy largo para que el log no sature la terminal.
   * Mantiene el primer fragmento que suele ser suficiente para confirmar
   * que el contenido del email es el esperado durante desarrollo.
   */
  private previewBody(body: string): string {
    const MAX = 200;
    const collapsed = body.replace(/\s+/g, ' ').trim();
    return collapsed.length > MAX
      ? collapsed.slice(0, MAX) + '… [truncado]'
      : collapsed;
  }
}
