import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { CertificateRenderer } from '../services/certificate-renderer';
import { toCertificateDesign } from '../services/certificate-design';
import { PreviewTemplateDesignDto } from '../dto/preview-template-design.dto';
import { CertificateDate } from '../value-objects';

/**
 * Certificado de muestra con un diseño aún sin guardar, dibujado por el mismo
 * CertificateRenderer que la emisión. No guarda nada ni consume números.
 */
@Injectable()
export class PreviewTemplateDesignUseCase {
  constructor(
    private readonly templateGateway: CertificateTemplateGateway,
    private readonly fileStorageGateway: FileStorageGateway,
    private readonly renderer: CertificateRenderer,
    private readonly configService: ConfigService,
  ) {}

  async execute(id: string, dto: PreviewTemplateDesignDto): Promise<Buffer> {
    const template = await this.templateGateway.findOne(id);
    if (!template) throw new NotFoundException(`Plantilla ${id} no encontrada`);

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    return this.renderer.render({
      templatePdf: await this.fileStorageGateway.readFileByUrl(
        template.filePath,
      ),
      design: toCertificateDesign(dto),
      recipientName: dto.sampleName.trim(),
      // Misma forma que una URL real, para que el QR tenga la misma densidad.
      verificationUrl: `${frontendUrl}/certificados/00000000-0000-0000-0000-000000000000`,
      date: CertificateDate.fromIso(dto.sampleDate),
    });
  }
}
