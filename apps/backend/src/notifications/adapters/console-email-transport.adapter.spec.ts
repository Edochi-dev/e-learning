import { Logger } from '@nestjs/common';
import { ConsoleEmailTransport } from './console-email-transport.adapter';

describe('ConsoleEmailTransport', () => {
  let transport: ConsoleEmailTransport;
  let logSpy: jest.SpyInstance;

  const logged = () => (logSpy.mock.calls as string[][])[0][0];

  beforeEach(() => {
    transport = new ConsoleEmailTransport();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('logs recipient, subject and body', async () => {
    await transport.deliver({
      to: 'ana@example.com',
      subject: 'Tu corrección fue aprobada',
      body: '<p>¡Felicidades Ana!</p>',
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logged()).toContain('ana@example.com');
    expect(logged()).toContain('Tu corrección fue aprobada');
    expect(logged()).toContain('¡Felicidades Ana!');
  });

  it('truncates long bodies', async () => {
    const longBody = 'a'.repeat(500);
    await transport.deliver({ to: 't@e.com', subject: 's', body: longBody });

    expect(logged()).toContain('… [truncado]');
    expect(logged()).not.toContain(longBody);
  });

  it('collapses whitespace in the body preview', async () => {
    await transport.deliver({
      to: 't@e.com',
      subject: 's',
      body: '<p>line one</p>\n\n\n   <p>line two</p>',
    });

    expect(logged()).toContain('<p>line one</p> <p>line two</p>');
  });

  it('reports itself as the provider', async () => {
    await expect(
      transport.deliver({ to: 't@e.com', subject: 's', body: 'b' }),
    ).resolves.toEqual({ provider: 'console' });
  });
});
