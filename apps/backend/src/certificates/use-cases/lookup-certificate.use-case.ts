import { Injectable, NotFoundException } from '@nestjs/common';
import { CertificateGateway } from '../gateways/certificate.gateway';

/**
 * LookupCertificateUseCase
 *
 * Búsqueda pública de certificado por número correlativo (ej: MR-00001).
 * Devuelve solo el UUID para que el frontend redirija a /certificados/:id.
 * No expone datos sensibles del lote ni del template.
 */
@Injectable()
export class LookupCertificateUseCase {
    constructor(private readonly certificateGateway: CertificateGateway) {}

    async execute(certificateNumber: string): Promise<{ id: string }> {
        const cert = await this.certificateGateway.findByNumber(certificateNumber.toUpperCase());
        if (!cert) throw new NotFoundException('Certificado no encontrado');
        return { id: cert.id };
    }
}
