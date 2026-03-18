import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateGeneratorGateway } from '../gateways/certificate-generator.gateway';
import { QrCodeGateway } from '../gateways/qr-code.gateway';
import { Certificate } from '../entities/certificate.entity';
import { GenerateCertificateBatchDto } from '../dto/generate-certificate-batch.dto';

export interface GeneratedCertificateSummary {
  id: string;
  certificateNumber: string;
  recipientName: string;
}

/**
 * GenerateCertificateBatchUseCase
 *
 * Orquesta la generación de múltiples certificados a partir de una lista de nombres.
 * Por cada nombre:
 *  1. Calcula el número de certificado (ej. MR-00003)
 *  2. Genera el QR que apunta a la página de verificación pública
 *  3. Genera el PDF con el nombre y el QR superpuestos en la plantilla
 *  4. Guarda el PDF en disco
 *  5. Persiste el registro en la base de datos
 *
 * IMPORTANTE: Este use case usa ConfigService para obtener FRONTEND_URL.
 * El QR debe apuntar al FRONTEND (donde vive la página de verificación),
 * no al backend. Por eso necesitamos la URL del frontend como variable de entorno.
 */
@Injectable()
export class GenerateCertificateBatchUseCase {
  private readonly publicDir = join(__dirname, '..', '..', '..', 'public');

  constructor(
    private readonly certificateGateway: CertificateGateway,
    private readonly templateGateway: CertificateTemplateGateway,
    private readonly generatorGateway: CertificateGeneratorGateway,
    private readonly qrGateway: QrCodeGateway,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    dto: GenerateCertificateBatchDto,
  ): Promise<GeneratedCertificateSummary[]> {
    const template = await this.templateGateway.findOne(dto.templateId);
    if (!template)
      throw new NotFoundException(`Plantilla ${dto.templateId} no encontrada`);

    // Convertimos la ruta URL del template a ruta del filesystem
    // "/static/certificates/templates/xxx.pdf" → "public/certificates/templates/xxx.pdf"
    const templateAbsPath = join(
      this.publicDir,
      template.filePath.replace('/static/', ''),
    );

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const results: GeneratedCertificateSummary[] = [];

    const destFolder = join(this.publicDir, 'certificates', 'generated');
    await mkdir(destFolder, { recursive: true });

    for (const name of dto.names) {
      const trimmedName = name.trim();
      if (!trimmedName) continue;

      // 1. Calcular el número correlativo de este certificado
      const count = await this.certificateGateway.countByAbbreviation(
        template.courseAbbreviation,
      );
      const certificateNumber = `${template.courseAbbreviation}-${String(count + 1).padStart(5, '0')}`;

      // 2. Generar UUID que será el ID del certificado y la URL de verificación
      const certId = randomUUID();
      const verificationUrl = `${frontendUrl}/certificados/${certId}`;

      // 3. Generar QR apuntando a la URL de verificación.
      // El tamaño en pixels se calcula para 300 DPI:
      // qrSize está en puntos PDF (1pt = 1/72 pulgada). A 300 DPI: pixels = (pts/72)*300
      const pixelSize = Math.ceil((template.qrSize / 72) * 300);
      const qrBuffer = await this.qrGateway.generate(
        verificationUrl,
        pixelSize,
      );

      // Fecha de emisión en formato DD/MM/YYYY.
      // Se genera en el momento exacto de creación de cada certificado.
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const dateText = `${dd}/${mm}/${yyyy}`;

      // 4. Generar el PDF con nombre, QR y (opcionalmente) fecha superpuestos
      const pdfBuffer = await this.generatorGateway.generate({
        templatePath: templateAbsPath,
        recipientName: trimmedName,
        qrBuffer,
        namePosition: { x: template.namePositionX, y: template.namePositionY },
        fontSize: template.nameFontSize,
        nameColor: template.nameColor,
        fontFamily: template.fontFamily ?? 'Helvetica',
        nameAlign: (template.nameAlign ?? 'left') as 'left' | 'center',
        qrPosition: { x: template.qrPositionX, y: template.qrPositionY },
        qrSize: template.qrSize,
        ...(template.showDate && {
          dateText,
          datePosition: {
            x: template.datePositionX,
            y: template.datePositionY,
          },
          dateFontSize: template.dateFontSize,
          dateColor: template.dateColor,
          dateFontFamily: template.dateFontFamily,
          dateAlign: (template.dateAlign ?? 'left') as 'left' | 'center',
        }),
      });

      // 5. Guardar el PDF generado en disco
      const filename = `${certId}.pdf`;
      await writeFile(join(destFolder, filename), pdfBuffer);
      const filePath = `/static/certificates/generated/${filename}`;

      // 6. Persistir en la base de datos
      const cert = await this.certificateGateway.create({
        id: certId,
        certificateNumber,
        recipientName: trimmedName,
        template,
        filePath,
      } as Partial<Certificate>);

      results.push({
        id: cert.id,
        certificateNumber: cert.certificateNumber,
        recipientName: cert.recipientName,
      });
    }

    return results;
  }
}
