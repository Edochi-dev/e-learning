import { Injectable } from '@nestjs/common';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { CreateCertificateTemplateDto } from '../dto/create-certificate-template.dto';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { TemplateFilePreparer } from '../services/template-file-preparer';

/**
 * UploadCertificateTemplateUseCase
 *
 * Recibe el PDF plantilla y los metadatos del formulario. TemplateFilePreparer
 * lo valida, lo optimiza, aplica la regla de peso y lee sus dimensiones;
 * guardar los bytes es cosa de FileStorageGateway.
 */
@Injectable()
export class UploadCertificateTemplateUseCase {
  constructor(
    private readonly templateGateway: CertificateTemplateGateway,
    private readonly fileStorageGateway: FileStorageGateway,
    private readonly templateFilePreparer: TemplateFilePreparer,
  ) {}

  async execute(
    dto: CreateCertificateTemplateDto,
    file: Express.Multer.File,
  ): Promise<CertificateTemplate> {
    // Valida, optimiza y aplica la regla de peso antes de escribir nada.
    const {
      file: prepared,
      pageWidth,
      pageHeight,
    } = await this.templateFilePreparer.prepare(file);

    const filePath = await this.fileStorageGateway.saveFile(
      prepared,
      'certificates/templates',
    );

    // Persistir el registro de plantilla en la base de datos.
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
