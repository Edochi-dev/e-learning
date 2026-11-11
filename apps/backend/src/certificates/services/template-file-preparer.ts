import { Injectable } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { TemplatePdfOptimizerGateway } from '../gateways/template-pdf-optimizer.gateway';
import { assertTemplateWithinSizeLimit } from '../value-objects/template-size-limit.vo';

export interface PreparedTemplateFile {
  /** El archivo que se debe guardar: el PDF optimizado, con el nombre original. */
  file: Express.Multer.File;
  pageWidth: number;
  pageHeight: number;
}

/**
 * Único paso por el que pasa todo PDF de plantilla antes de guardarse (subida y
 * reemplazo): lo valida, lo optimiza y aplica la regla de peso. Nada se escribe
 * en el storage si falla.
 */
@Injectable()
export class TemplateFilePreparer {
  constructor(private readonly optimizer: TemplatePdfOptimizerGateway) {}

  async prepare(file: Express.Multer.File): Promise<PreparedTemplateFile> {
    // Un PDF corrupto falla aquí, antes de optimizar o guardar nada.
    await PDFDocument.load(file.buffer);

    const optimized = await this.optimizer.optimize(file.buffer);
    assertTemplateWithinSizeLimit(file.buffer.length, optimized.length);

    const page = (await PDFDocument.load(optimized)).getPages()[0];
    const { width, height } = page.getSize();
    return {
      file: { ...file, buffer: optimized, size: optimized.length },
      pageWidth: width,
      pageHeight: height,
    };
  }
}
