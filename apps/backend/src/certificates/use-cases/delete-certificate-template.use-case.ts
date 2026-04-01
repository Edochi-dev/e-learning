import { Injectable, NotFoundException } from '@nestjs/common';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';

export type CertAction = 'delete' | 'keep';

/**
 * DeleteCertificateTemplateUseCase — Elimina una plantilla y opcionalmente sus certificados.
 *
 * Antes, este Use Case usaba `unlink` de fs/promises directamente y tenía
 * su propio `publicDir` — violaciones de Clean Architecture.
 * Ahora delega toda la gestión de archivos a FileStorageGateway.deleteByUrl.
 */
@Injectable()
export class DeleteCertificateTemplateUseCase {
  constructor(
    private readonly templateGateway: CertificateTemplateGateway,
    private readonly certificateGateway: CertificateGateway,
    private readonly fileStorageGateway: FileStorageGateway,
  ) {}

  async execute(id: string, certAction: CertAction = 'keep'): Promise<void> {
    // 1. Verificar que la plantilla existe
    const template = await this.templateGateway.findOne(id);
    if (!template) throw new NotFoundException(`Plantilla ${id} no encontrada`);

    // 2. Manejar los certificados asociados según la acción elegida
    if (certAction === 'delete') {
      // Eliminar registros y archivos PDF de los certificados emitidos
      const certs = await this.certificateGateway.deleteAllByTemplateId(id);
      await Promise.all(
        certs.map((cert) => this.fileStorageGateway.deleteByUrl(cert.filePath)),
      );
    } else {
      // 'keep': desconectar los certificados de la plantilla (templateId = NULL)
      // Los PDFs ya emitidos siguen existiendo y siendo válidos.
      await this.certificateGateway.unlinkAllFromTemplate(id);
    }

    // 3. Borrar el archivo PDF de la plantilla del disco
    await this.fileStorageGateway.deleteByUrl(template.filePath);

    // 4. Eliminar el registro de la base de datos
    await this.templateGateway.delete(id);
  }
}
