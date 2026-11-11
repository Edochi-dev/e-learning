import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib';
import sharp from 'sharp';
import { PdfLibTemplateOptimizer } from './pdf-lib-template-optimizer';

const A4 = { width: 595.2, height: 841.92 };

/** Foto JPEG con contenido no trivial (para que pese algo). */
async function photo(
  width: number,
  height: number,
  channels: 1 | 3 = 3,
): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height * channels);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 31 + (i >> 9)) & 255;
  return sharp(pixels, { raw: { width, height, channels } })
    .toColourspace(channels === 1 ? 'b-w' : 'srgb')
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** Una página A4 con la foto dibujada al tamaño indicado (por defecto, la página entera). */
async function template(
  jpeg: Buffer,
  drawn: { width: number; height: number } = A4,
  pages = 1,
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const image = await doc.embedJpg(jpeg);
  for (let i = 0; i < pages; i++) {
    doc
      .addPage([A4.width, A4.height])
      .drawImage(image, { x: 0, y: 0, ...drawn });
  }
  const xmp = doc.context.stream('<x:xmpmeta>'.padEnd(40_000, ' '), {
    Type: 'Metadata',
    Subtype: 'XML',
  });
  doc.catalog.set(PDFName.of('Metadata'), doc.context.register(xmp));
  return Buffer.from(await doc.save());
}

async function images(pdf: Buffer) {
  const doc = await PDFDocument.load(pdf);
  const found: Array<{ width: number; height: number; jpeg: Buffer }> = [];
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    if (object.dict.get(PDFName.of('Subtype')) !== PDFName.of('Image'))
      continue;
    const size = (key: string) =>
      (object.dict.get(PDFName.of(key)) as PDFNumber).asNumber();
    found.push({
      width: size('Width'),
      height: size('Height'),
      jpeg: Buffer.from(object.contents),
    });
  }
  return { doc, found };
}

describe('PdfLibTemplateOptimizer', () => {
  const optimizer = new PdfLibTemplateOptimizer();

  it('a 300 ppp o menos: quita metadatos y copia la imagen byte a byte', async () => {
    const original = await template(await photo(1240, 1754)); // A4 a 150 ppp

    const optimized = await optimizer.optimize(original);

    expect(optimized.length).toBeLessThan(original.length);
    const before = await images(original);
    const after = await images(optimized);
    expect(after.doc.catalog.has(PDFName.of('Metadata'))).toBe(false);
    expect(after.found).toHaveLength(1);
    expect(after.found[0]).toMatchObject({ width: 1240, height: 1754 });
    expect(after.found[0].jpeg.equals(before.found[0].jpeg)).toBe(true);
    expect(after.doc.getPages()[0].getSize()).toEqual(A4);
  });

  it('baja a 300 ppp exactos una foto dibujada con más resolución', async () => {
    // 2 × 1 pulgadas dibujadas con 1200 × 600 px = 600 ppp.
    const original = await template(await photo(1200, 600), {
      width: 144,
      height: 72,
    });

    const { found } = await images(await optimizer.optimize(original));

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ width: 600, height: 300 });
    expect((await sharp(found[0].jpeg).metadata()).width).toBe(600);
  });

  it('una foto en escala de grises sigue en escala de grises', async () => {
    const original = await template(await photo(1200, 600, 1), {
      width: 144,
      height: 72,
    });

    const { doc, found } = await images(await optimizer.optimize(original));

    expect(found[0]).toMatchObject({ width: 600, height: 300 });
    expect((await sharp(found[0].jpeg).metadata()).channels).toBe(1);
    const [, image] = [...doc.context.enumerateIndirectObjects()].find(
      ([, o]) =>
        o instanceof PDFRawStream &&
        o.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'),
    )!;
    expect((image as PDFRawStream).dict.get(PDFName.of('ColorSpace'))).toBe(
      PDFName.of('DeviceGray'),
    );
  });

  it('no re-muestrea una imagen compartida entre páginas', async () => {
    const original = await template(
      await photo(1200, 600),
      { width: 144, height: 72 },
      2,
    );

    const { found } = await images(await optimizer.optimize(original));

    expect(found[0]).toMatchObject({ width: 1200, height: 600 });
  });

  it('devuelve el original si no puede leer el PDF', async () => {
    const broken = Buffer.from('%PDF-1.7 roto');
    await expect(optimizer.optimize(broken)).resolves.toBe(broken);
  });
});
