import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateGeneratorGateway } from '../gateways/certificate-generator.gateway';
import { QrCodeGateway } from '../gateways/qr-code.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
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
 *  4. Guarda el PDF en disco via FileStorageGateway
 *  5. Persiste el registro en la base de datos
 *
 * IMPORTANTE: Este use case usa ConfigService para obtener FRONTEND_URL.
 * El QR debe apuntar al FRONTEND (donde vive la página de verificación),
 * no al backend. Por eso necesitamos la URL del frontend como variable de entorno.
 *
 * Nota: CertificateGeneratorGateway.generate() recibe un templatePath absoluto.
 * Usamos FileStorageGateway.resolveAbsolutePath() — pero como ese método no existe
 * aún, por ahora le pasamos la URL y dejamos que el generator la resuelva.
 * Alternativa: le pasamos el Buffer del template (leído via readFileByUrl).
 * Elegimos pasar el buffer para mantener limpia la abstracción.
 */
@Injectable()
export class GenerateCertificateBatchUseCase {
  constructor(
    private readonly certificateGateway: CertificateGateway,
    private readonly templateGateway: CertificateTemplateGateway,
    private readonly generatorGateway: CertificateGeneratorGateway,
    private readonly qrGateway: QrCodeGateway,
    private readonly fileStorageGateway: FileStorageGateway,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    dto: GenerateCertificateBatchDto,
  ): Promise<GeneratedCertificateSummary[]> {
    const template = await this.templateGateway.findOne(dto.templateId);
    if (!template)
      throw new NotFoundException(`Plantilla ${dto.templateId} no encontrada`);

    // Leer el PDF de la plantilla via el gateway — el Use Case no sabe
    // dónde vive el archivo ni cómo se estructura la URL.
    const templateBuffer = await this.fileStorageGateway.readFileByUrl(
      template.filePath,
    );

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const results: GeneratedCertificateSummary[] = [];

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
      const pixelSize = Math.ceil((template.qrStyle.size / 72) * 300);
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
      const { nameStyle, qrStyle, dateStyle } = template;

      const pdfBuffer = await this.generatorGateway.generate({
        templatePath: templateBuffer,
        recipientName: trimmedName,
        qrBuffer,
        namePosition: { x: nameStyle.positionX, y: nameStyle.positionY },
        fontSize: nameStyle.fontSize,
        nameColor: nameStyle.color,
        fontFamily: nameStyle.fontFamily ?? 'Helvetica',
        nameAlign: nameStyle.align ?? 'left',
        qrPosition: { x: qrStyle.positionX, y: qrStyle.positionY },
        qrSize: qrStyle.size,
        ...(dateStyle.show && {
          dateText,
          datePosition: {
            x: dateStyle.positionX,
            y: dateStyle.positionY,
          },
          dateFontSize: dateStyle.fontSize,
          dateColor: dateStyle.color,
          dateFontFamily: dateStyle.fontFamily,
          dateAlign: dateStyle.align ?? 'left',
        }),
      });

      // 5. Guardar el PDF generado via FileStorageGateway
      const filename = `${certId}.pdf`;
      const filePath = await this.fileStorageGateway.saveBuffer(
        pdfBuffer,
        'certificates/generated',
        filename,
      );

      // 6. Persistir en la base de datos
      //
      // CONGELAR el snapshot de plantilla AHORA: una vez que esta fila se
      // inserta, los metadatos `templateSnapshot` se quedan inmutables. Si
      // mañana el admin edita la plantilla, este certificado seguirá
      // mostrando los datos que recibió el alumno en su momento. La FK
      // `template` se mantiene para auditoría pero NO se lee en la UI.
      const cert = await this.certificateGateway.create({
        id: certId,
        certificateNumber,
        recipientName: trimmedName,
        template,
        templateSnapshot: {
          name: template.name,
          courseAbbreviation: template.courseAbbreviation,
          paperFormat: template.paperFormat,
        },
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
