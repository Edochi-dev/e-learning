import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from '../storage/storage.module';
import { CertificatesController } from './certificates.controller';
import { CertificateTemplate } from './entities/certificate-template.entity';
import { Certificate } from './entities/certificate.entity';
import { CertificateTemplateGateway } from './gateways/certificate-template.gateway';
import { CertificateGateway } from './gateways/certificate.gateway';
import { CertificateGeneratorGateway } from './gateways/certificate-generator.gateway';
import { QrCodeGateway } from './gateways/qr-code.gateway';
import { CertificateArchiveGateway } from './gateways/certificate-archive.gateway';
import { CertificateTemplatesRepository } from './certificate-templates.repository';
import { CertificatesRepository } from './certificates.repository';
import { PdfCertificateGenerator } from './pdf-certificate-generator';
import { QrCodeService } from './qr-code.service';
import { ArchiverZipGateway } from './archiver-zip.gateway';
import { UploadCertificateTemplateUseCase } from './use-cases/upload-certificate-template.use-case';
import { EditCertificateTemplateUseCase } from './use-cases/edit-certificate-template.use-case';
import { UpdateTemplateDesignUseCase } from './use-cases/update-template-design.use-case';
import { ListCertificateTemplatesUseCase } from './use-cases/list-certificate-templates.use-case';
import { GetCertificateTemplateUseCase } from './use-cases/get-certificate-template.use-case';
import { GenerateCertificateBatchUseCase } from './use-cases/generate-certificate-batch.use-case';
import { GetCertificateUseCase } from './use-cases/get-certificate.use-case';
import { DownloadCertificateBatchUseCase } from './use-cases/download-certificate-batch.use-case';
import { DeleteCertificateTemplateUseCase } from './use-cases/delete-certificate-template.use-case';
import { DeleteCertificateUseCase } from './use-cases/delete-certificate.use-case';
import { LookupCertificateUseCase } from './use-cases/lookup-certificate.use-case';

/**
 * CertificatesModule
 *
 * Aquí es donde NestJS conecta las abstracciones con sus implementaciones.
 * La regla de la Clean Architecture se mantiene: los Use Cases solo conocen
 * los gateways abstractos. El módulo es el único lugar donde se decide
 * qué implementación concreta usar.
 *
 * Si mañana queremos guardar los PDFs en S3 en vez del filesystem,
 * solo cambiaríamos las implementaciones aquí — los Use Cases no se tocan.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CertificateTemplate, Certificate]),
    ConfigModule, // Necesario para ConfigService en GenerateCertificateBatchUseCase
    StorageModule, // Necesario para FileStorageGateway en delete use cases
  ],
  controllers: [CertificatesController],
  providers: [
    // Use Cases
    UploadCertificateTemplateUseCase,
    EditCertificateTemplateUseCase,
    UpdateTemplateDesignUseCase,
    ListCertificateTemplatesUseCase,
    GetCertificateTemplateUseCase,
    GenerateCertificateBatchUseCase,
    GetCertificateUseCase,
    DownloadCertificateBatchUseCase,
    DeleteCertificateTemplateUseCase,
    DeleteCertificateUseCase,
    LookupCertificateUseCase,

    // Wiring: abstracción → implementación concreta
    {
      provide: CertificateTemplateGateway,
      useClass: CertificateTemplatesRepository,
    },
    { provide: CertificateGateway, useClass: CertificatesRepository },
    { provide: CertificateGeneratorGateway, useClass: PdfCertificateGenerator },
    { provide: QrCodeGateway, useClass: QrCodeService },
    { provide: CertificateArchiveGateway, useClass: ArchiverZipGateway },
  ],
})
export class CertificatesModule {}
