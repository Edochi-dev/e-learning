import { Injectable, NotFoundException } from '@nestjs/common';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { ArchiveFile } from '../gateways/certificate-archive.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import {
  BundleLayout,
  CertificateBundle,
  CertificateBundler,
} from '../services/certificate-bundler';
import { ZipCertificateBundler } from '../services/zip-certificate-bundler';
import { MergedPdfCertificateBundler } from '../services/merged-pdf-certificate-bundler';

export type DownloadResult = CertificateBundle;

/**
 * Descarga uno o varios certificados. Uno solo sale tal cual (su PDF
 * original); varios se empaquetan según `layout`: un ZIP con un PDF por
 * certificado, o un solo PDF con una página tras otra para imprimir.
 */
@Injectable()
export class DownloadCertificateBatchUseCase {
  private readonly bundlers: Record<BundleLayout, CertificateBundler>;

  constructor(
    private readonly certificateGateway: CertificateGateway,
    private readonly fileStorageGateway: FileStorageGateway,
    zipBundler: ZipCertificateBundler,
    mergedPdfBundler: MergedPdfCertificateBundler,
  ) {
    this.bundlers = { separate: zipBundler, merged: mergedPdfBundler };
  }

  async execute(
    ids: string[],
    layout: BundleLayout = 'separate',
  ): Promise<DownloadResult> {
    const files: ArchiveFile[] = [];

    for (const id of ids) {
      const cert = await this.certificateGateway.findOne(id);
      if (!cert) throw new NotFoundException(`Certificado ${id} no encontrado`);

      const buffer = await this.fileStorageGateway.readFileByUrl(cert.filePath);

      const safeFilename =
        cert.recipientName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim() ||
        cert.certificateNumber;
      files.push({
        filename: `${cert.certificateNumber} - ${safeFilename}.pdf`,
        buffer,
      });
    }

    if (files.length === 1) {
      return {
        buffer: files[0].buffer,
        filename: files[0].filename,
        isZip: false,
      };
    }

    return this.bundlers[layout].bundle(files);
  }
}
