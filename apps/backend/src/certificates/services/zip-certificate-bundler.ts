import { Injectable } from '@nestjs/common';
import {
  ArchiveFile,
  CertificateArchiveGateway,
} from '../gateways/certificate-archive.gateway';
import { CertificateBundle, CertificateBundler } from './certificate-bundler';

/** One PDF per certificate inside a ZIP: for sending each one on its own. */
@Injectable()
export class ZipCertificateBundler extends CertificateBundler {
  constructor(private readonly archiveGateway: CertificateArchiveGateway) {
    super();
  }

  async bundle(files: ArchiveFile[]): Promise<CertificateBundle> {
    return {
      buffer: await this.archiveGateway.createZip(files),
      filename: 'certificados.zip',
      isZip: true,
    };
  }
}
