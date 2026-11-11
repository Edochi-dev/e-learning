import { PayloadTooLargeException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { CERTIFICATE_TEMPLATE_MAX_BYTES } from '@maris-nails/shared';
import { TemplateFilePreparer } from './template-file-preparer';
import { TemplatePdfOptimizerGateway } from '../gateways/template-pdf-optimizer.gateway';

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
  let optimize: jest.Mock<Promise<Buffer>, [Buffer]>;
  let preparer: TemplateFilePreparer;

  beforeEach(() => {
    optimize = jest.fn<Promise<Buffer>, [Buffer]>();
    const optimizer: TemplatePdfOptimizerGateway = { optimize };
    preparer = new TemplateFilePreparer(optimizer);
  });

  it('devuelve el PDF optimizado, con su peso y las dimensiones de la página', async () => {
    const original = await pdf(842, 595);
    const optimized = await pdf(842, 595);
    optimize.mockResolvedValue(optimized);

    const prepared = await preparer.prepare(upload(original));

    expect(optimize).toHaveBeenCalledWith(original);
    expect(prepared.file.buffer).toBe(optimized);
    expect(prepared.file.size).toBe(optimized.length);
    expect(prepared.file.originalname).toBe('plantilla.pdf');
    expect(prepared).toMatchObject({ pageWidth: 842, pageHeight: 595 });
  });

  it('lee las dimensiones de la primera página de un PDF multipágina', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    doc.addPage([1000, 2000]);
    const multipage = Buffer.from(await doc.save());
    optimize.mockResolvedValue(multipage);

    await expect(preparer.prepare(upload(multipage))).resolves.toMatchObject({
      pageWidth: 595,
      pageHeight: 842,
    });
  });

  it('aplica el límite sobre el PDF optimizado', async () => {
    const heavy = Buffer.concat([
      await pdf(842, 595),
      Buffer.alloc(CERTIFICATE_TEMPLATE_MAX_BYTES), // relleno tras %%EOF
    ]);
    optimize.mockResolvedValue(heavy);

    await expect(preparer.prepare(upload(heavy))).rejects.toThrow(
      PayloadTooLargeException,
    );
  });

  it('rechaza un PDF corrupto sin intentar optimizarlo', async () => {
    await expect(
      preparer.prepare(upload(Buffer.from('no es un pdf'))),
    ).rejects.toThrow();
    expect(optimize).not.toHaveBeenCalled();
  });
});
