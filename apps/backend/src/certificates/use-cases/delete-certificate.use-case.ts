import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { CertificateGateway } from '../gateways/certificate.gateway';

@Injectable()
export class DeleteCertificateUseCase {
  private readonly publicDir = join(__dirname, '..', '..', '..', 'public');

  constructor(private readonly certificateGateway: CertificateGateway) {}

  async execute(id: string): Promise<void> {
    const cert = await this.certificateGateway.findOne(id);
    if (!cert) throw new NotFoundException(`Certificado ${id} no encontrado`);

    // Borrar el PDF del disco
    const relativePath = cert.filePath.replace('/static/', '');
    await unlink(join(this.publicDir, relativePath)).catch(() => {});

    // Borrar el registro de la BD
    await this.certificateGateway.delete(id);
  }
}
