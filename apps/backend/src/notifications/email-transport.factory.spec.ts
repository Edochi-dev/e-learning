import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { buildEmailTransport } from './email-transport.factory';

jest.mock('nodemailer');

describe('buildEmailTransport', () => {
  const PRIMARY = {
    SMTP_HOST: 'smtp-relay.brevo.com',
    SMTP_PORT: 587,
    SMTP_SECURE: 'false',
    SMTP_USER: 'brevo-user',
    SMTP_PASS: 'brevo-pass',
    SMTP_FROM: 'Maris Nails <no-reply@notificaciones.example.com>',
  };
  const FALLBACK = {
    SMTP_FALLBACK_HOST: 'smtp.resend.com',
    SMTP_FALLBACK_PORT: '465',
    SMTP_FALLBACK_SECURE: 'true',
    SMTP_FALLBACK_USER: 'resend',
    SMTP_FALLBACK_PASS: 're_key',
    SMTP_FALLBACK_FROM: 'Maris Nails <no-reply@notificaciones.example.com>',
  };

  const configWith = (env: Record<string, unknown>): ConfigService =>
    ({
      get: jest.fn((key: string) => env[key]),
      getOrThrow: jest.fn((key: string) => {
        if (env[key] === undefined) throw new Error(`Missing env: ${key}`);
        return env[key];
      }),
    }) as unknown as ConfigService;

  let createTransportMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    createTransportMock = (
      nodemailer.createTransport as jest.Mock
    ).mockReturnValue({ sendMail: jest.fn() });
  });

  it('logs to the console when no SMTP is configured', () => {
    const transport = buildEmailTransport(configWith({}));

    expect(transport.name).toBe('console');
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it('uses only the primary relay when no fallback is configured', () => {
    const transport = buildEmailTransport(configWith(PRIMARY));

    expect(transport.name).toBe('smtp-relay.brevo.com');
    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: { user: 'brevo-user', pass: 'brevo-pass' },
    });
  });

  it('chains primary then fallback when both are configured', () => {
    const transport = buildEmailTransport(
      configWith({ ...PRIMARY, ...FALLBACK }),
    );

    expect(transport.name).toBe('smtp-relay.brevo.com > smtp.resend.com');
    expect(createTransportMock).toHaveBeenLastCalledWith({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: 're_key' },
    });
  });
});
