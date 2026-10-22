import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from '../storage/storage.module';
import { CertificateTemplate } from './entities/certificate-template.entity';
import { Certificate } from './entities/certificate.entity';
import { CertificateNumberSequence } from './entities/certificate-number-sequence.entity';
import { CertificateTemplateGateway } from './gateways/certificate-template.gateway';
import { CertificateGateway } from './gateways/certificate.gateway';
import { CertificateNumberSequenceGateway } from './gateways/certificate-number-sequence.gateway';
import { CertificateSearchGateway } from './gateways/certificate-search.gateway';
import { CertificateDateStamperGateway } from './gateways/certificate-date-stamper.gateway';
import { CertificateGeneratorGateway } from './gateways/certificate-generator.gateway';
import { QrCodeGateway } from './gateways/qr-code.gateway';
import { CertificateArchiveGateway } from './gateways/certificate-archive.gateway';
import { PdfMergerGateway } from './gateways/pdf-merger.gateway';
import { CertificateTemplatesRepository } from './certificate-templates.repository';
import { CertificatesRepository } from './certificates.repository';
import { CertificateNumberSequenceRepository } from './certificate-number-sequence.repository';
import { PdfCertificateGenerator } from './pdf-certificate-generator';
import { QrCodeService } from './qr-code.service';
import { ArchiverZipGateway } from './archiver-zip.gateway';
import { PdfLibMerger } from './pdf-lib-merger';
import { UploadCertificateTemplateUseCase } from './use-cases/upload-certificate-template.use-case';
import { EditCertificateTemplateUseCase } from './use-cases/edit-certificate-template.use-case';
import { UpdateTemplateDesignUseCase } from './use-cases/update-template-design.use-case';
import { ListCertificateTemplatesUseCase } from './use-cases/list-certificate-templates.use-case';
import { GetCertificateTemplateUseCase } from './use-cases/get-certificate-template.use-case';
import { GenerateCertificateBatchUseCase } from './use-cases/generate-certificate-batch.use-case';
import { GetCertificateUseCase } from './use-cases/get-certificate.use-case';
import { DownloadCertificateBatchUseCase } from './use-cases/download-certificate-batch.use-case';
import { DeleteCertificateTemplateUseCase } from './use-cases/delete-certificate-template.use-case';
import { DeleteCertificateBatchUseCase } from './use-cases/delete-certificate-batch.use-case';
import { SearchCertificatesUseCase } from './use-cases/search-certificates.use-case';
import { ListCertificateCoursesUseCase } from './use-cases/list-certificate-courses.use-case';
import { StampCertificateDatesUseCase } from './use-cases/stamp-certificate-dates.use-case';
import { LookupCertificateUseCase } from './use-cases/lookup-certificate.use-case';
import { GetMyCertificatesUseCase } from './use-cases/get-my-certificates.use-case';
import { PreviewTemplateDesignUseCase } from './use-cases/preview-template-design.use-case';
import { GenerateBlankCertificatesUseCase } from './use-cases/generate-blank-certificates.use-case';
import { CertificateRenderer } from './services/certificate-renderer';

const USE_CASES = [
  UploadCertificateTemplateUseCase,
  EditCertificateTemplateUseCase,
  UpdateTemplateDesignUseCase,
  ListCertificateTemplatesUseCase,
  GetCertificateTemplateUseCase,
  GenerateCertificateBatchUseCase,
  GetCertificateUseCase,
  DownloadCertificateBatchUseCase,
  DeleteCertificateTemplateUseCase,
  DeleteCertificateBatchUseCase,
  SearchCertificatesUseCase,
  ListCertificateCoursesUseCase,
  StampCertificateDatesUseCase,
  LookupCertificateUseCase,
  GetMyCertificatesUseCase,
  PreviewTemplateDesignUseCase,
  GenerateBlankCertificatesUseCase,
];

/**
 * CertificatesCoreModule — use cases and their gateway bindings, with no
 * delivery mechanism. HTTP (CertificatesModule) and the maintenance CLI both
 * build on it; importing it never drags in guards, throttling or routes.
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
    TypeOrmModule.forFeature([
      CertificateTemplate,
      Certificate,
      CertificateNumberSequence,
    ]),
    ConfigModule, // Necesario para ConfigService en GenerateCertificateBatchUseCase
    StorageModule, // Necesario para FileStorageGateway en delete use cases
  ],
  providers: [
    ...USE_CASES,
    CertificateRenderer,

    // Wiring: abstracción → implementación concreta
    {
      provide: CertificateTemplateGateway,
      useClass: CertificateTemplatesRepository,
    },
    { provide: CertificateGateway, useClass: CertificatesRepository },
    // Same instance: one repository implements both segregated contracts.
    { provide: CertificateSearchGateway, useExisting: CertificateGateway },
    {
      provide: CertificateNumberSequenceGateway,
      useClass: CertificateNumberSequenceRepository,
    },
    { provide: CertificateGeneratorGateway, useClass: PdfCertificateGenerator },
    {
      provide: CertificateDateStamperGateway,
      useExisting: CertificateGeneratorGateway,
    },
    { provide: QrCodeGateway, useClass: QrCodeService },
    { provide: CertificateArchiveGateway, useClass: ArchiverZipGateway },
    { provide: PdfMergerGateway, useClass: PdfLibMerger },
  ],
  exports: USE_CASES,
})
export class CertificatesCoreModule {}
