import { Injectable } from '@nestjs/common';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { UpdateTemplatePositionsDto } from '../dto/update-template-positions.dto';

/**
 * UpdateTemplatePositionsUseCase
 *
 * Guarda las coordenadas elegidas por el admin en el picker visual del frontend.
 * Todas las posiciones se almacenan en puntos PDF (el sistema de coordenadas nativo).
 */
@Injectable()
export class UpdateTemplatePositionsUseCase {
    constructor(private readonly templateGateway: CertificateTemplateGateway) {}

    async execute(id: string, dto: UpdateTemplatePositionsDto): Promise<CertificateTemplate> {
        return this.templateGateway.update(id, {
            namePositionX: dto.namePositionX,
            namePositionY: dto.namePositionY,
            nameFontSize: dto.nameFontSize,
            nameColor: dto.nameColor,
            fontFamily: dto.fontFamily,
            qrPositionX: dto.qrPositionX,
            qrPositionY: dto.qrPositionY,
            qrSize: dto.qrSize,
        });
    }
}
