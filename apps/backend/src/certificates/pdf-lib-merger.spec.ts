import { PDFDocument } from 'pdf-lib';
import { PdfLibMerger } from './pdf-lib-merger';

describe('PdfLibMerger', () => {
  const merger = new PdfLibMerger();

  async function pdfWithPages(sizes: [number, number][]): Promise<Buffer> {
    const doc = await PDFDocument.create();
    sizes.forEach((size) => doc.addPage(size));
    return Buffer.from(await doc.save());
  }

  it('une las páginas de todos los PDF en orden y con su tamaño', async () => {
    const a4 = await pdfWithPages([[595, 842]]);
    const landscapeTwoPages = await pdfWithPages([
      [842, 595],
      [842, 595],
    ]);

    const result = await PDFDocument.load(
      await merger.merge([a4, landscapeTwoPages, a4]),
    );

    expect(result.getPages().map((page) => page.getSize())).toEqual([
      { width: 595, height: 842 },
      { width: 842, height: 595 },
      { width: 842, height: 595 },
      { width: 595, height: 842 },
    ]);
  });
});
