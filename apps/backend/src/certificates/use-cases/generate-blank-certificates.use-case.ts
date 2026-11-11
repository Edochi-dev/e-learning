import { Injectable, NotFoundException } from '@nestjs/common';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateDateStamperGateway } from '../gateways/certificate-date-stamper.gateway';
import { PdfMergerGateway } from '../gateways/pdf-merger.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { GenerateBlankCertificatesDto } from '../dto/generate-blank-certificates.dto';
import { CertificateDate, createDateStamp } from '../value-objects';

export interface BlankCertificatesFile {
  pdf: Buffer;
  filename: string;
}

/**
 * Certificados en blanco para imprimir de reserva: la plantilla con la fecha,
 * sin nombre ni QR, N copias en un solo PDF.
 *
 * Do not add a QR, a number or a database row: having none of them is what
 * keeps these sheets from ever passing as a verifiable certificate.
 */
@Injectable()
export class GenerateBlankCertificatesUseCase {
  constructor(
    private readonly templateGateway: CertificateTemplateGateway,
    private readonly fileStorageGateway: FileStorageGateway,
    private readonly stamperGateway: CertificateDateStamperGateway,
    private readonly mergerGateway: PdfMergerGateway,
  ) {}

  async execute(
    templateId: string,
    dto: GenerateBlankCertificatesDto,
  ): Promise<BlankCertificatesFile> {
    const template = await this.templateGateway.findOne(templateId);
    if (!template)
      throw new NotFoundException(`Plantilla ${templateId} no encontrada`);

    const date = CertificateDate.fromIso(dto.certificateDate);
    const dated = await this.stamperGateway.stamp(
      await this.fileStorageGateway.readFileByUrl(template.filePath),
      createDateStamp(template.dateStyle, date),
    );

    return {
      pdf: await this.mergerGateway.merge(
        Array.from({ length: dto.copies }, () => dated),
      ),
      filename: `${template.courseAbbreviation} en blanco ${date.toIso()}.pdf`,
    };
  }
}
