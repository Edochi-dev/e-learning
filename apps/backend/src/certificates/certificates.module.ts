import { Module } from '@nestjs/common';
import { CertificatesCoreModule } from './certificates-core.module';
import { CertificatesController } from './certificates.controller';

/** HTTP delivery for certificates. */
@Module({
  imports: [CertificatesCoreModule],
  controllers: [CertificatesController],
})
export class CertificatesModule {}
