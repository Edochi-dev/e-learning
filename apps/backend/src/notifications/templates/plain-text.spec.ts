import { fragmentToPlainText } from './plain-text';

describe('fragmentToPlainText', () => {
  it('turns paragraphs into blank-line separated text and decodes entities', () => {
    expect(
      fragmentToPlainText(
        '<p>Hola <strong>Ana &amp; Luisa</strong>,</p>\n  <p>Segunda línea</p>',
      ),
    ).toBe('Hola Ana & Luisa,\n\nSegunda línea');
  });

  it('keeps link targets visible', () => {
    expect(
      fragmentToPlainText('<p><a href="https://x.test/a">Abrir</a></p>'),
    ).toBe('Abrir (https://x.test/a)');
  });
});
