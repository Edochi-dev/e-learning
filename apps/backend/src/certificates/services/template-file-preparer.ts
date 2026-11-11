import { Injectable } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { assertTemplateWithinSizeLimit } from '../value-objects/template-size-limit.vo';

export interface PreparedTemplateFile {
  /** El archivo que se debe guardar. */
  file: Express.Multer.File;
  pageWidth: number;
  pageHeight: number;
}

/**
 * Único paso por el que pasa todo PDF de plantilla antes de guardarse (subida y
 * reemplazo): lo valida y aplica la regla de peso. Nada se escribe en el storage
 * si falla.
 */
@Injectable()
export class TemplateFilePreparer {
  async prepare(file: Express.Multer.File): Promise<PreparedTemplateFile> {
    // Un PDF corrupto falla aquí, antes de guardar nada.
    const page = (await PDFDocument.load(file.buffer)).getPages()[0];
    assertTemplateWithinSizeLimit(file.buffer.length, file.buffer.length);

    const { width, height } = page.getSize();
    return { file, pageWidth: width, pageHeight: height };
  }
}
