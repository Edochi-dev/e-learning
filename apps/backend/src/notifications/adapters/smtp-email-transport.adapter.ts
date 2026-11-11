import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { EmailMessage } from '../domain/email-message';
import { inlineImagesFor } from '../templates/brand-assets';
import {
  DeliveryReceipt,
  EmailTransport,
} from '../gateways/email-transport.gateway';

export interface SmtpSettings {
  host: string;
  port: number;
  /** true for implicit TLS (465), false for STARTTLS (587). */
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

/**
 * Delivers through one SMTP relay. Provider-agnostic: the primary and the
 * fallback relay are two instances with different settings. The transporter is built once and reused.
 */
export class SmtpEmailTransport extends EmailTransport {
  readonly name: string;
  private readonly transporter: Transporter;

  constructor(private readonly settings: SmtpSettings) {
    super();
    this.name = settings.host;
    this.transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: { user: settings.user, pass: settings.pass },
    });
  }

  async deliver(message: EmailMessage): Promise<DeliveryReceipt> {
    await this.transporter.sendMail({
      from: this.settings.from,
      to: message.to,
      subject: message.subject,
      html: message.body,
      text: message.textBody ?? undefined,
      attachments: inlineImagesFor(message.body),
    });
    return { provider: this.name };
  }
}
