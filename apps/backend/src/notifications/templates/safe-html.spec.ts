import { escapeHtml, html } from './safe-html';

describe('html tagged template', () => {
  it('escapes interpolated strings', () => {
    const name = '<a href="https://evil.test">Ana</a>';
    expect(html`<p>Hola ${name}</p>`.value).toBe(
      '<p>Hola &lt;a href=&quot;https://evil.test&quot;&gt;Ana&lt;/a&gt;</p>',
    );
  });

  it('keeps nested SafeHtml as-is', () => {
    const inner = html`<strong>${'Ana & Luisa'}</strong>`;
    expect(html`<p>${inner}</p>`.value).toBe(
      '<p><strong>Ana &amp; Luisa</strong></p>',
    );
  });

  it('escapes quotes so values are safe inside attributes', () => {
    expect(escapeHtml(`" onmouseover='x'`)).toBe(
      '&quot; onmouseover=&#39;x&#39;',
    );
  });
});
