import { Injectable, NotFoundException } from '@nestjs/common';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';

/**
 * DeleteCertificateUseCase — Elimina un certificado y su archivo PDF.
 *
 * Estrategia "DB primero, archivos después":
 *   1. Verificar que el certificado existe
 *   2. Borrar el PDF del disco via deleteByUrl (best-effort)
 *   3. Borrar el registro de la BD
 *
 * Antes, este Use Case usaba `unlink` de fs/promises directamente,
 * lo cual violaba Clean Architecture: el Use Case conocía el filesystem.
 * Ahora delega a FileStorageGateway, que es una abstracción.
 */
@Injectable()
export class DeleteCertificateUseCase {
  constructor(
    private readonly certificateGateway: CertificateGateway,
    private readonly fileStorageGateway: FileStorageGateway,
  ) {}

  async execute(id: string): Promise<void> {
    const cert = await this.certificateGateway.findOne(id);
    if (!cert) throw new NotFoundException(`Certificado ${id} no encontrado`);

    // Borrar el PDF del disco — deleteByUrl maneja la ruta y los errores
    await this.fileStorageGateway.deleteByUrl(cert.filePath);

    // Borrar el registro de la BD
    await this.certificateGateway.delete(id);
  }
}
