import { Injectable, NotFoundException } from '@nestjs/common';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { CertificateArchiveGateway } from '../gateways/certificate-archive.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';

export interface DownloadResult {
  buffer: Buffer;
  filename: string;
  isZip: boolean;
}

/**
 * DownloadCertificateBatchUseCase
 *
 * Maneja la descarga de uno o varios certificados:
 * - Si ids.length === 1: devuelve el PDF directamente
 * - Si ids.length > 1:  devuelve un ZIP con todos los PDFs
 *
 * ¿Por qué esta lógica vive en el Use Case y no en el Controller?
 * Porque es una DECISIÓN DE NEGOCIO: "un certificado = descarga directa,
 * varios = descarga comprimida". El controller solo decide cómo enviar la respuesta HTTP.
 *
 * Ahora usa FileStorageGateway.readFileByUrl en lugar de acceder al filesystem
 * directamente. Así el Use Case no sabe si los PDFs viven en disco local o en S3.
 */
@Injectable()
export class DownloadCertificateBatchUseCase {
  constructor(
    private readonly certificateGateway: CertificateGateway,
    private readonly archiveGateway: CertificateArchiveGateway,
    private readonly fileStorageGateway: FileStorageGateway,
  ) {}

  async execute(ids: string[]): Promise<DownloadResult> {
    const files: { filename: string; buffer: Buffer }[] = [];

    for (const id of ids) {
      const cert = await this.certificateGateway.findOne(id);
      if (!cert) throw new NotFoundException(`Certificado ${id} no encontrado`);

      // readFileByUrl maneja la conversión de URL → filesystem internamente
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

    const zipBuffer = await this.archiveGateway.createZip(files);
    return { buffer: zipBuffer, filename: 'certificados.zip', isZip: true };
  }
}
