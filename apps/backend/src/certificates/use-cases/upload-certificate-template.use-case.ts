import { Injectable } from '@nestjs/common';
import { join, extname } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { CreateCertificateTemplateDto } from '../dto/create-certificate-template.dto';

/**
 * UploadCertificateTemplateUseCase
 *
 * Recibe el archivo PDF plantilla y los metadatos del formulario.
 * Usa pdf-lib para leer las dimensiones reales del PDF (en puntos PDF)
 * y las guarda junto con la ruta del archivo en la base de datos.
 *
 * ¿Por qué guardar pageWidth y pageHeight?
 * El frontend necesita estas dimensiones para renderizar el PDF a escala
 * y convertir las coordenadas de pixel a coordenadas de puntos PDF
 * cuando el admin hace click para posicionar el nombre y el QR.
 */
@Injectable()
export class UploadCertificateTemplateUseCase {
  // Ruta a la carpeta public/ del backend (funciona en dev y prod)
  private readonly publicDir = join(__dirname, '..', '..', '..', 'public');

  constructor(private readonly templateGateway: CertificateTemplateGateway) {}

  async execute(
    dto: CreateCertificateTemplateDto,
    file: Express.Multer.File,
  ): Promise<CertificateTemplate> {
    // 1. Guardar el archivo PDF en disco
    const ext = extname(file.originalname) || '.pdf';
    const filename = `${randomUUID()}${ext}`;
    const destFolder = join(this.publicDir, 'certificates', 'templates');
    const destPath = join(destFolder, filename);

    await mkdir(destFolder, { recursive: true });
    await writeFile(destPath, file.buffer);

    const filePath = `/static/certificates/templates/${filename}`;

    // 2. Leer las dimensiones del PDF con pdf-lib
    const pdfDoc = await PDFDocument.load(file.buffer);
    const firstPage = pdfDoc.getPages()[0];
    const { width: pageWidth, height: pageHeight } = firstPage.getSize();

    // 3. Persistir en la base de datos
    return this.templateGateway.create({
      name: dto.name,
      courseAbbreviation: dto.courseAbbreviation.toUpperCase(),
      filePath,
      pageWidth,
      pageHeight,
      paperFormat: dto.paperFormat,
    });
  }
}
