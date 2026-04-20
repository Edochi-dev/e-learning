import { Injectable } from '@nestjs/common';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { UpdateTemplateDesignDto } from '../dto/update-template-design.dto';
import { DEFAULT_QR_STYLE } from '../value-objects/qr-style.vo';

/**
 * UpdateTemplateDesignUseCase
 *
 * Guarda el diseño visual completo de una plantilla: posiciones, tipografías,
 * tamaños, colores, alineaciones y visibilidad de los elementos. Todas las
 * coordenadas se almacenan en puntos PDF (el sistema de coordenadas nativo).
 *
 * Renombrado desde UpdateTemplatePositionsUseCase: el nombre anterior era
 * engañoso porque sugería que solo guardaba coordenadas, cuando en realidad
 * el DTO incluye fontFamily, fontSize, color, align, qrSize, etc.
 *
 * El DTO llega agrupado en value objects (nameStyle, qrStyle, dateStyle).
 * El gateway.update() recibe los mismos value objects y TypeORM los guarda
 * directamente como jsonb — sin mapeo manual campo por campo.
 */
@Injectable()
export class UpdateTemplateDesignUseCase {
  constructor(private readonly templateGateway: CertificateTemplateGateway) {}

  async execute(
    id: string,
    dto: UpdateTemplateDesignDto,
  ): Promise<CertificateTemplate> {
    return this.templateGateway.update(id, {
      nameStyle: dto.nameStyle,
      qrStyle: {
        ...dto.qrStyle,
        foregroundColor:
          dto.qrStyle.foregroundColor ?? DEFAULT_QR_STYLE.foregroundColor,
        backgroundColor:
          dto.qrStyle.backgroundColor ?? DEFAULT_QR_STYLE.backgroundColor,
      },
      dateStyle: dto.dateStyle,
    });
  }
}
