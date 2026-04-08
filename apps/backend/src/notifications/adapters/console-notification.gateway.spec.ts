import { Logger } from '@nestjs/common';
import { ConsoleNotificationGateway } from './console-notification.gateway';

/**
 * Tests para ConsoleNotificationGateway.
 *
 * Mockeamos el método log del Logger de Nest para verificar que el adapter
 * imprime el mensaje sin tener que parsear stdout. El test no se preocupa
 * del formato exacto, solo de que el contenido relevante (to, subject, body)
 * aparece en algún lado de la salida.
 */
describe('ConsoleNotificationGateway', () => {
  let gateway: ConsoleNotificationGateway;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    gateway = new ConsoleNotificationGateway();
    // Espiamos el método log del prototype para interceptar TODAS las
    // instancias de Logger. Es la forma estándar de mockear el Logger de Nest.
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('imprime el mensaje con los tres campos del email', async () => {
    await gateway.sendEmail({
      to: 'ana@example.com',
      subject: 'Tu corrección fue aprobada',
      body: '<p>¡Felicidades Ana!</p>',
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = (logSpy.mock.calls as string[][])[0][0];
    expect(output).toContain('ana@example.com');
    expect(output).toContain('Tu corrección fue aprobada');
    expect(output).toContain('¡Felicidades Ana!');
  });

  it('trunca el body cuando excede el límite de preview', async () => {
    const longBody = 'a'.repeat(500);
    await gateway.sendEmail({
      to: 'test@example.com',
      subject: 'Long body',
      body: longBody,
    });

    const output = (logSpy.mock.calls as string[][])[0][0];
    expect(output).toContain('… [truncado]');
    // El body completo NO debe aparecer
    expect(output).not.toContain(longBody);
  });

  it('colapsa whitespace múltiple en el preview del body', async () => {
    await gateway.sendEmail({
      to: 'test@example.com',
      subject: 'Whitespace test',
      body: '<p>line one</p>\n\n\n   <p>line two</p>',
    });

    const output = (logSpy.mock.calls as string[][])[0][0];
    // Los saltos de línea y espacios múltiples se colapsan a un solo espacio
    expect(output).toContain('<p>line one</p> <p>line two</p>');
  });

  it('resuelve sin lanzar (es failsafe — nunca debe romper el caller)', async () => {
    await expect(
      gateway.sendEmail({ to: 't@e.com', subject: 's', body: 'b' }),
    ).resolves.toBeUndefined();
  });
});
