import { Injectable } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { PdfMergerGateway } from './gateways/pdf-merger.gateway';

@Injectable()
export class PdfLibMerger implements PdfMergerGateway {
  async merge(pdfs: Buffer[]): Promise<Buffer> {
    const output = await PDFDocument.create();

    for (const pdf of pdfs) {
      const source = await PDFDocument.load(pdf);
      const pages = await output.copyPages(source, source.getPageIndices());
      pages.forEach((page) => output.addPage(page));
    }

    return Buffer.from(await output.save());
  }
}
