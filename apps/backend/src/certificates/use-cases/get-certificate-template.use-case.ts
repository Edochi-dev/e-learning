import { Injectable, NotFoundException } from '@nestjs/common';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';

/**
 * GetCertificateTemplateUseCase
 *
 * Retorna una plantilla por su ID. Lanza NotFoundException si no existe.
 *
 * Espejo de GetCertificateUseCase pero para plantillas. Sigue el mismo
 * patrón que el resto de recursos del sistema (`GET /:id` con su use case
 * dedicado, no filtrar del listado completo).
 */
@Injectable()
export class GetCertificateTemplateUseCase {
  constructor(private readonly templateGateway: CertificateTemplateGateway) {}

  async execute(id: string): Promise<CertificateTemplate> {
    const template = await this.templateGateway.findOne(id);
    if (!template) {
      throw new NotFoundException(`Plantilla ${id} no encontrada`);
    }
    return template;
  }
}
