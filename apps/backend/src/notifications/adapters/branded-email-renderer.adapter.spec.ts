import { ConfigService } from '@nestjs/config';
import { BrandedEmailRenderer } from './branded-email-renderer.adapter';
import { BRAND_LOGO } from '../templates/brand-assets';
import { html } from '../templates/safe-html';

describe('BrandedEmailRenderer', () => {
  const renderer = new BrandedEmailRenderer({
    get: () => 'https://marisnails.academy',
  } as unknown as ConfigService);

  const message = renderer.render({
    to: 'ana@example.com',
    subject: 'Restablece tu contraseña',
    content: {
      preheader: 'Vence en 1 hora',
      heading: 'Hola <Ana>',
      body: html`<p>Texto ${'<b>de</b>'} prueba</p>`,
      action: { label: 'Elegir contraseña', path: '/restablecer?token=abc' },
      footnote: 'Si no fuiste tú, ignora este correo.',
    },
  });

  it('keeps recipient and subject', () => {
    expect(message.to).toBe('ana@example.com');
    expect(message.subject).toBe('Restablece tu contraseña');
  });

  it('wraps the content in the branded layout with the inline logo', () => {
    expect(message.body).toContain(`cid:${BRAND_LOGO.cid}`);
    expect(message.body).toContain('Vence en 1 hora');
    expect(message.body).toContain('Si no fuiste tú, ignora este correo.');
  });

  it('builds the button URL from the site URL and the path', () => {
    expect(message.body).toContain(
      'href="https://marisnails.academy/restablecer?token=abc"',
    );
  });

  it('escapes text fields', () => {
    expect(message.body).toContain('Hola &lt;Ana&gt;');
    expect(message.body).toContain('Texto &lt;b&gt;de&lt;/b&gt; prueba');
  });

  it('produces a plain-text alternative with the link spelled out', () => {
    expect(message.textBody).toContain('Hola <Ana>');
    expect(message.textBody).toContain('Texto <b>de</b> prueba');
    expect(message.textBody).toContain(
      'Elegir contraseña: https://marisnails.academy/restablecer?token=abc',
    );
  });
});
