import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateGateway } from '../gateways/certificate.gateway';

export type CertAction = 'delete' | 'keep';

@Injectable()
export class DeleteCertificateTemplateUseCase {
  private readonly publicDir = join(__dirname, '..', '..', '..', 'public');

  constructor(
    private readonly templateGateway: CertificateTemplateGateway,
    private readonly certificateGateway: CertificateGateway,
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
        certs.map((cert) => {
          const relativePath = cert.filePath.replace('/static/', '');
          return unlink(join(this.publicDir, relativePath)).catch(() => {});
        }),
      );
    } else {
      // 'keep': desconectar los certificados de la plantilla (templateId = NULL)
      // Los PDFs ya emitidos siguen existiendo y siendo válidos.
      await this.certificateGateway.unlinkAllFromTemplate(id);
    }

    // 3. Borrar el archivo PDF de la plantilla del disco
    const relativePath = template.filePath.replace('/static/', '');
    await unlink(join(this.publicDir, relativePath)).catch(() => {});

    // 4. Eliminar el registro de la base de datos
    await this.templateGateway.delete(id);
  }
}
