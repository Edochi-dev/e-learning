import { Logger } from '@nestjs/common';
import { FailoverEmailTransport } from './failover-email-transport.adapter';
import { EmailTransport } from '../gateways/email-transport.gateway';

describe('FailoverEmailTransport', () => {
  const message = { to: 'ana@example.com', subject: 's', body: 'b' };

  const stubTransport = (name: string, error?: Error) => {
    const deliver = error
      ? jest.fn().mockRejectedValue(error)
      : jest.fn().mockResolvedValue({ provider: name });
    return { transport: { name, deliver } as EmailTransport, deliver };
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the primary and never touches the fallback when it succeeds', async () => {
    const primary = stubTransport('brevo');
    const fallback = stubTransport('resend');

    const receipt = await new FailoverEmailTransport([
      primary.transport,
      fallback.transport,
    ]).deliver(message);

    expect(receipt).toEqual({ provider: 'brevo' });
    expect(primary.deliver).toHaveBeenCalledWith(message);
    expect(fallback.deliver).not.toHaveBeenCalled();
  });

  it('falls back when the primary rejects, and reports the fallback', async () => {
    const primary = stubTransport('brevo', new Error('daily limit reached'));
    const fallback = stubTransport('resend');

    const receipt = await new FailoverEmailTransport([
      primary.transport,
      fallback.transport,
    ]).deliver(message);

    expect(receipt).toEqual({ provider: 'resend' });
    expect(fallback.deliver).toHaveBeenCalledWith(message);
  });

  it('fails with every reason when all transports fail', async () => {
    const chain = new FailoverEmailTransport([
      stubTransport('brevo', new Error('timeout')).transport,
      stubTransport('resend', new Error('auth failed')).transport,
    ]);

    await expect(chain.deliver(message)).rejects.toThrow(
      /brevo: timeout.*resend: auth failed/,
    );
  });

  it('is named after its chain', () => {
    const chain = new FailoverEmailTransport([
      stubTransport('brevo').transport,
      stubTransport('resend').transport,
    ]);
    expect(chain.name).toBe('brevo > resend');
  });

  it('rejects an empty chain', () => {
    expect(() => new FailoverEmailTransport([])).toThrow();
  });
});
