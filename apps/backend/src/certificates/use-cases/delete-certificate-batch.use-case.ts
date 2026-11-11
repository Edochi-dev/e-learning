import { Injectable, NotFoundException } from '@nestjs/common';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';

@Injectable()
export class DeleteCertificateBatchUseCase {
  constructor(
    private readonly certificateGateway: CertificateGateway,
    private readonly fileStorageGateway: FileStorageGateway,
  ) {}

  /**
   * All or nothing: if any id is unknown, nothing is deleted. Rows go before
   * files, so a failed DB delete never leaves certificates pointing at missing
   * PDFs; a failed file delete only leaves an orphan file behind.
   */
  async execute(ids: string[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];
    const certificates = await this.certificateGateway.findByIds(uniqueIds);

    if (certificates.length !== uniqueIds.length) {
      const found = new Set(certificates.map((c) => c.id));
      const missing = uniqueIds.filter((id) => !found.has(id));
      throw new NotFoundException(
        `Certificados no encontrados: ${missing.join(', ')}`,
      );
    }

    await this.certificateGateway.deleteMany(uniqueIds);

    for (const certificate of certificates) {
      await this.fileStorageGateway.deleteByUrl(certificate.filePath);
    }
  }
}
