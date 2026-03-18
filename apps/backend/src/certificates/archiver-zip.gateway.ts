import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require('archiver');
import { PassThrough } from 'stream';
import {
  CertificateArchiveGateway,
  ArchiveFile,
} from './gateways/certificate-archive.gateway';

/**
 * ArchiverZipGateway — Implementación concreta de CertificateArchiveGateway
 *
 * Usa la librería 'archiver' para comprimir múltiples Buffers de PDFs
 * en un único archivo ZIP en memoria (sin escribir en disco).
 * El ZIP resultante se envía directamente como respuesta HTTP al admin.
 */
@Injectable()
export class ArchiverZipGateway implements CertificateArchiveGateway {
  async createZip(files: ArchiveFile[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const passThrough = new PassThrough();
      const chunks: Buffer[] = [];

      passThrough.on('data', (chunk: Buffer) => chunks.push(chunk));
      passThrough.on('end', () => resolve(Buffer.concat(chunks)));
      passThrough.on('error', reject);

      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.on('error', reject);
      archive.pipe(passThrough);

      for (const file of files) {
        archive.append(file.buffer, { name: file.filename });
      }

      archive.finalize();
    });
  }
}
