import { Injectable } from '@nestjs/common';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { UpdateTemplatePositionsDto } from '../dto/update-template-positions.dto';

/**
 * UpdateTemplatePositionsUseCase
 *
 * Guarda las coordenadas elegidas por el admin en el picker visual del frontend.
 * Todas las posiciones se almacenan en puntos PDF (el sistema de coordenadas nativo).
 *
 * Ahora el DTO llega agrupado en value objects (nameStyle, qrStyle, dateStyle).
 * El gateway.update() recibe los mismos value objects y TypeORM los guarda
 * directamente como jsonb — sin mapeo manual campo por campo.
 */
@Injectable()
export class UpdateTemplatePositionsUseCase {
  constructor(private readonly templateGateway: CertificateTemplateGateway) {}

  async execute(
    id: string,
    dto: UpdateTemplatePositionsDto,
  ): Promise<CertificateTemplate> {
    return this.templateGateway.update(id, {
      nameStyle: dto.nameStyle,
      qrStyle: dto.qrStyle,
      dateStyle: dto.dateStyle,
    });
  }
}
