import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SmtpNotificationGateway } from './smtp-notification.gateway';

/**
 * Tests para SmtpNotificationGateway.
 *
 * Mockeamos nodemailer.createTransport para no abrir conexiones reales en
 * tests. El mock devuelve un transporter falso con un sendMail spy que
 * podemos inspeccionar.
 *
 * Lo que verificamos:
 *   1. onModuleInit lee las envs correctas y construye el transporter.
 *   2. sendEmail delega al transporter con el shape correcto (incluyendo
 *      la dirección "from" leída de SMTP_FROM, no inventada).
 *   3. Si nodemailer falla, el error se propaga al caller (el contrato
 *      dice que debe lanzar — el caller decide qué hacer con el error).
 */
jest.mock('nodemailer');

describe('SmtpNotificationGateway', () => {
  let gateway: SmtpNotificationGateway;
  let sendMailMock: jest.Mock;
  let createTransportMock: jest.Mock;

  const envs: Record<string, string> = {
    SMTP_HOST: 'smtp.test.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'user@test.com',
    SMTP_PASS: 'secret',
    SMTP_FROM: "Mari's Nails <noreply@test.com>",
  };

  const buildConfigService = (): ConfigService =>
    ({
      get: jest.fn((key: string) => envs[key]),
      getOrThrow: jest.fn((key: string) => {
        const value = envs[key];
        if (value === undefined) throw new Error(`Missing env: ${key}`);
        return value;
      }),
    }) as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'fake-id' });
    createTransportMock = (
      nodemailer.createTransport as jest.Mock
    ).mockReturnValue({
      sendMail: sendMailMock,
    });

    gateway = new SmtpNotificationGateway(buildConfigService());
    gateway.onModuleInit();
  });

  it('crea el transporter con los valores leídos del ConfigService', () => {
    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      auth: { user: 'user@test.com', pass: 'secret' },
    });
  });

  it('interpreta SMTP_SECURE=true como secure: true', () => {
    envs.SMTP_SECURE = 'true';
    const g = new SmtpNotificationGateway(buildConfigService());
    g.onModuleInit();
    // La segunda llamada a createTransport corresponde a esta nueva instancia.
    // Tipamos explícitamente el argumento para que TypeScript no lo infiera
    // como `any` (jest.Mock devuelve any por diseño).
    const calls = createTransportMock.mock.calls as Array<
      [{ secure: boolean }]
    >;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.secure).toBe(true);
    envs.SMTP_SECURE = 'false'; // restaurar
  });

  it('delega a transporter.sendMail con el shape correcto al enviar', async () => {
    await gateway.sendEmail({
      to: 'ana@example.com',
      subject: 'Bienvenida',
      body: '<h1>Hola Ana</h1>',
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith({
      from: "Mari's Nails <noreply@test.com>",
      to: 'ana@example.com',
      subject: 'Bienvenida',
      html: '<h1>Hola Ana</h1>',
    });
  });

  it('propaga errores cuando transporter.sendMail falla', async () => {
    const smtpError = new Error('Connection refused');
    sendMailMock.mockRejectedValueOnce(smtpError);

    await expect(
      gateway.sendEmail({ to: 't@e.com', subject: 's', body: 'b' }),
    ).rejects.toThrow('Connection refused');
  });
});
