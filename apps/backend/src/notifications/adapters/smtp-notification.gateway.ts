import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  NotificationGateway,
  EmailMessage,
} from '../gateways/notification.gateway';

/**
 * SmtpNotificationGateway — Adapter real que envía emails vía SMTP.
 *
 * Usa nodemailer como cliente SMTP. La configuración viene de variables
 * de entorno validadas en AppModule (Joi schema), así que si falta alguna
 * el backend ni siquiera arranca — fail fast en boot, no en el primer
 * email del día.
 *
 * Variables que consume:
 *   SMTP_HOST     → host del servidor SMTP (ej. smtp.gmail.com)
 *   SMTP_PORT     → puerto (587 para STARTTLS, 465 para SSL directo)
 *   SMTP_SECURE   → 'true' si el puerto usa SSL directo (465), 'false' si STARTTLS (587)
 *   SMTP_USER     → usuario de autenticación
 *   SMTP_PASS     → contraseña o app-password
 *   SMTP_FROM     → cabecera "From" visible al destinatario
 *
 * Ciclo de vida:
 *   El transporter se crea UNA vez en onModuleInit (singleton de NestJS).
 *   No re-creamos el cliente por cada email — eso desperdicia conexiones.
 *
 * Nota arquitectónica importante:
 *   Este adapter NO sabe nada del dominio. No conoce alumnas, ni cursos,
 *   ni correcciones. Solo sabe enviar un email con tres campos. Toda la
 *   lógica de "qué decirle a quién y por qué" vive en los use cases que
 *   construyen el EmailMessage antes de pasarlo aquí.
 */
@Injectable()
export class SmtpNotificationGateway
  extends NotificationGateway
  implements OnModuleInit
{
  private readonly logger = new Logger(SmtpNotificationGateway.name);
  private transporter!: Transporter;
  private fromAddress!: string;

  constructor(private readonly config: ConfigService) {
    super();
  }

  /**
   * onModuleInit se ejecuta una vez cuando NestJS termina de cablear el
   * módulo. Aquí construimos el transporter para que esté listo antes
   * del primer sendEmail. Si falta una env, la lectura con
   * `getOrThrow` lanza y el backend rehúsa arrancar — comportamiento
   * deseado: prefiero un crash al boot que un email fantasma a las 3 AM.
   */
  onModuleInit(): void {
    const host = this.config.getOrThrow<string>('SMTP_HOST');
    const port = parseInt(this.config.getOrThrow<string>('SMTP_PORT'), 10);
    const secure = this.config.get<string>('SMTP_SECURE') === 'true';
    const user = this.config.getOrThrow<string>('SMTP_USER');
    const pass = this.config.getOrThrow<string>('SMTP_PASS');
    this.fromAddress = this.config.getOrThrow<string>('SMTP_FROM');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    this.logger.log(
      `SMTP transporter inicializado (host=${host}, port=${port}, secure=${secure})`,
    );
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    // Delegamos al transporter. Si la entrega falla, nodemailer lanza —
    // dejamos que el error se propague para que el caller decida qué
    // hacer (logear, reintentar, mostrar al usuario, etc.).
    await this.transporter.sendMail({
      from: this.fromAddress,
      to: message.to,
      subject: message.subject,
      html: message.body,
    });
  }
}
