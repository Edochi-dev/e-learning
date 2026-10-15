import { ConfigService } from '@nestjs/config';
import { EmailTransport } from './gateways/email-transport.gateway';
import {
  SmtpEmailTransport,
  SmtpSettings,
} from './adapters/smtp-email-transport.adapter';
import { ConsoleEmailTransport } from './adapters/console-email-transport.adapter';
import { FailoverEmailTransport } from './adapters/failover-email-transport.adapter';

/** Env prefixes of the SMTP relays, in failover order. */
const SMTP_PROVIDER_PREFIXES = ['SMTP_', 'SMTP_FALLBACK_'] as const;

/**
 * Builds the delivery chain from the env: every configured SMTP relay in
 * order, or the console when there is none. The no-SMTP fallback is implicit
 * so production cannot end up in console mode while credentials exist.
 */
export function buildEmailTransport(config: ConfigService): EmailTransport {
  const relays = SMTP_PROVIDER_PREFIXES.map((prefix) =>
    readSmtpSettings(config, prefix),
  )
    .filter((settings): settings is SmtpSettings => settings !== null)
    .map((settings) => new SmtpEmailTransport(settings));

  return new FailoverEmailTransport(
    relays.length > 0 ? relays : [new ConsoleEmailTransport()],
  );
}

// Joi guarantees the rest of the group is present once <prefix>HOST is set.
function readSmtpSettings(
  config: ConfigService,
  prefix: string,
): SmtpSettings | null {
  const host = config.get<string>(`${prefix}HOST`);
  if (!host) return null;
  return {
    host,
    port: Number(config.getOrThrow<string | number>(`${prefix}PORT`)),
    secure: String(config.get(`${prefix}SECURE`)) === 'true',
    user: config.getOrThrow<string>(`${prefix}USER`),
    pass: config.getOrThrow<string>(`${prefix}PASS`),
    from: config.getOrThrow<string>(`${prefix}FROM`),
  };
}
