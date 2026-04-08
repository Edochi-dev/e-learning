import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationGateway } from './gateways/notification.gateway';
import { ConsoleNotificationGateway } from './adapters/console-notification.gateway';
import { SmtpNotificationGateway } from './adapters/smtp-notification.gateway';

/**
 * NotificationsModule — Cablea el contrato NotificationGateway con su
 * adapter concreto, eligiendo en runtime según las variables de entorno.
 *
 * Regla de selección:
 *   Si SMTP_HOST está definido en .env → SmtpNotificationGateway (real)
 *   Si NO está definido               → ConsoleNotificationGateway (no envía)
 *
 * El switch es IMPLÍCITO (sin una flag dedicada NOTIFICATIONS_DRIVER) por
 * dos razones:
 *   1. Una env menos que mantener.
 *   2. Es imposible llegar a producción "sin querer en modo console":
 *      si configuras SMTP, automáticamente usa SMTP. Si no lo configuras,
 *      no hay credenciales que enviar — el modo console es la única opción
 *      sensata.
 *
 * Nota técnica del wiring:
 *   Usamos useFactory en lugar de useClass porque la decisión depende
 *   del ConfigService en runtime. NestJS resuelve la factory una sola
 *   vez al construir el módulo, y a partir de ahí inyecta SIEMPRE la
 *   misma instancia (singleton). Si SMTP es elegido, su onModuleInit
 *   también corre una sola vez y construye el transporter.
 *
 * Nota Clean Architecture:
 *   Todos los demás módulos del sistema solo conocen NotificationGateway.
 *   Nadie importa SmtpNotificationGateway ni ConsoleNotificationGateway
 *   directamente — eso rompería el desacoplamiento. Si en el futuro
 *   agregamos un MailgunNotificationGateway o un QueuedNotificationGateway,
 *   el cambio vive AQUÍ y nadie más se entera.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // Ambos adapters están registrados como providers individuales para que
    // NestJS sepa cómo instanciarlos cuando la factory los elija.
    ConsoleNotificationGateway,
    SmtpNotificationGateway,
    {
      provide: NotificationGateway,
      inject: [
        ConfigService,
        ConsoleNotificationGateway,
        SmtpNotificationGateway,
      ],
      useFactory: (
        config: ConfigService,
        consoleGateway: ConsoleNotificationGateway,
        smtpGateway: SmtpNotificationGateway,
      ): NotificationGateway => {
        const smtpHost = config.get<string>('SMTP_HOST');
        return smtpHost ? smtpGateway : consoleGateway;
      },
    },
  ],
  exports: [NotificationGateway],
})
export class NotificationsModule {}
