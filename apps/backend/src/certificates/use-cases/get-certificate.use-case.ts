import { Injectable, NotFoundException } from '@nestjs/common';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { Certificate } from '../entities/certificate.entity';

/**
 * GetCertificateUseCase
 *
 * Retorna los datos de un certificado para la página de verificación pública.
 * Incluye el nombre del titular, número de certificado, fecha de emisión y la URL del PDF.
 */
@Injectable()
export class GetCertificateUseCase {
    constructor(private readonly certificateGateway: CertificateGateway) {}

    async execute(id: string): Promise<Certificate> {
        const cert = await this.certificateGateway.findOne(id);
        if (!cert) throw new NotFoundException('Certificado no encontrado');
        return cert;
    }
}
