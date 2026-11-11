import { Injectable } from '@nestjs/common';
import { ArchiveFile } from '../gateways/certificate-archive.gateway';
import { PdfMergerGateway } from '../gateways/pdf-merger.gateway';
import { CertificateBundle, CertificateBundler } from './certificate-bundler';

/** Every certificate as consecutive pages of one PDF: for printing in one go. */
@Injectable()
export class MergedPdfCertificateBundler extends CertificateBundler {
  constructor(private readonly mergerGateway: PdfMergerGateway) {
    super();
  }

  async bundle(files: ArchiveFile[]): Promise<CertificateBundle> {
    return {
      buffer: await this.mergerGateway.merge(files.map((file) => file.buffer)),
      filename: 'certificados.pdf',
      isZip: false,
    };
  }
}
