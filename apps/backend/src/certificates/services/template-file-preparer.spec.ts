import { PayloadTooLargeException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { CERTIFICATE_TEMPLATE_MAX_BYTES } from '@maris-nails/shared';
import { TemplateFilePreparer } from './template-file-preparer';

async function pdf(width: number, height: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([width, height]);
  return Buffer.from(await doc.save());
}

const upload = (buffer: Buffer) =>
  ({
    originalname: 'plantilla.pdf',
    mimetype: 'application/pdf',
    buffer,
    size: buffer.length,
  }) as Express.Multer.File;

describe('TemplateFilePreparer', () => {
  const preparer = new TemplateFilePreparer();

  it('devuelve el archivo con las dimensiones de la página', async () => {
    const file = upload(await pdf(842, 595));

    const prepared = await preparer.prepare(file);

    expect(prepared.file).toBe(file);
    expect(prepared).toMatchObject({ pageWidth: 842, pageHeight: 595 });
  });

  it('lee las dimensiones de la primera página de un PDF multipágina', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    doc.addPage([1000, 2000]);
    const multipage = Buffer.from(await doc.save());

    await expect(preparer.prepare(upload(multipage))).resolves.toMatchObject({
      pageWidth: 595,
      pageHeight: 842,
    });
  });

  it('rechaza una plantilla que supera el límite de peso', async () => {
    const heavy = Buffer.concat([
      await pdf(842, 595),
      Buffer.alloc(CERTIFICATE_TEMPLATE_MAX_BYTES), // relleno tras %%EOF
    ]);

    await expect(preparer.prepare(upload(heavy))).rejects.toThrow(
      PayloadTooLargeException,
    );
  });

  it('rechaza un PDF corrupto', async () => {
    await expect(
      preparer.prepare(upload(Buffer.from('no es un pdf'))),
    ).rejects.toThrow();
  });
});
