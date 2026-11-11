import { PayloadTooLargeException } from '@nestjs/common';
import { CERTIFICATE_TEMPLATE_MAX_BYTES } from '@maris-nails/shared';
import {
  assertTemplateWithinSizeLimit,
  formatBytes,
} from './template-size-limit.vo';

const MB = 1024 * 1024;

function rejection(uploaded: number, stored: number): string {
  try {
    assertTemplateWithinSizeLimit(uploaded, stored);
  } catch (error) {
    expect(error).toBeInstanceOf(PayloadTooLargeException);
    return (error as Error).message;
  }
  throw new Error('se esperaba un rechazo');
}

describe('assertTemplateWithinSizeLimit', () => {
  it('el límite es 900 KB', () => {
    expect(CERTIFICATE_TEMPLATE_MAX_BYTES).toBe(900 * 1024);
  });

  it('acepta una plantilla justo en el límite', () => {
    expect(() =>
      assertTemplateWithinSizeLimit(
        CERTIFICATE_TEMPLATE_MAX_BYTES,
        CERTIFICATE_TEMPLATE_MAX_BYTES,
      ),
    ).not.toThrow();
  });

  it('mide lo que se guarda: una subida algo mayor que queda bajo el límite pasa', () => {
    expect(() =>
      assertTemplateWithinSizeLimit(
        CERTIFICATE_TEMPLATE_MAX_BYTES + 50_000,
        CERTIFICATE_TEMPLATE_MAX_BYTES - 1,
      ),
    ).not.toThrow();
  });

  it('rechaza con el peso subido, el límite y cómo exportarla más liviana', () => {
    const message = rejection(4.6 * MB, 4.6 * MB);
    expect(message).toContain(
      'La plantilla pesa 4,6 MB y el máximo es 900 KB.',
    );
    expect(message).toContain('Canva');
    expect(message).toContain('Comprimir archivo');
    expect(message).not.toContain('después de optimizarla');
  });

  it('no repite la cifra si la optimización no cambia lo que se muestra', () => {
    expect(rejection(2.72 * MB, 2.69 * MB)).not.toContain(
      'después de optimizarla',
    );
  });

  it('menciona el peso optimizado cuando la optimización ayudó pero no bastó', () => {
    expect(rejection(4.6 * MB, 4.5 * MB)).toContain(
      'pesa 4,6 MB (4,5 MB después de optimizarla) y el máximo es 900 KB',
    );
  });
});

describe('formatBytes', () => {
  it.each([
    [358_600, '351 KB'],
    [921_600, '900 KB'],
    [5.2 * MB, '5,2 MB'],
    [1 * MB, '1 MB'],
  ])('%i bytes → %s', (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });
});
