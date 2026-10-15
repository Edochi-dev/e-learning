import * as nodemailer from 'nodemailer';
import {
  SmtpEmailTransport,
  SmtpSettings,
} from './smtp-email-transport.adapter';

jest.mock('nodemailer');

describe('SmtpEmailTransport', () => {
  let sendMailMock: jest.Mock;
  let createTransportMock: jest.Mock;

  const settings: SmtpSettings = {
    host: 'smtp.test.com',
    port: 587,
    secure: false,
    user: 'user@test.com',
    pass: 'secret',
    from: "Mari's Nails <noreply@test.com>",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'fake-id' });
    createTransportMock = (
      nodemailer.createTransport as jest.Mock
    ).mockReturnValue({ sendMail: sendMailMock });
  });

  it('builds one transporter from its settings', () => {
    new SmtpEmailTransport(settings);

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      auth: { user: 'user@test.com', pass: 'secret' },
    });
  });

  it('is named after its host', () => {
    expect(new SmtpEmailTransport(settings).name).toBe('smtp.test.com');
  });

  it('sends with the configured From and reports itself as the provider', async () => {
    const receipt = await new SmtpEmailTransport(settings).deliver({
      to: 'ana@example.com',
      subject: 'Bienvenida',
      body: '<h1>Hola Ana</h1>',
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: "Mari's Nails <noreply@test.com>",
      to: 'ana@example.com',
      subject: 'Bienvenida',
      html: '<h1>Hola Ana</h1>',
    });
    expect(receipt).toEqual({ provider: 'smtp.test.com' });
  });

  it('propagates provider errors', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('Connection refused'));

    await expect(
      new SmtpEmailTransport(settings).deliver({
        to: 't@e.com',
        subject: 's',
        body: 'b',
      }),
    ).rejects.toThrow('Connection refused');
  });
});
