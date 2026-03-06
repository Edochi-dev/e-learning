import { Injectable } from '@nestjs/common';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';

export interface CertificateTemplateWithCount extends CertificateTemplate {
    certificateCount: number;
}

@Injectable()
export class ListCertificateTemplatesUseCase {
    constructor(
        private readonly templateGateway: CertificateTemplateGateway,
        private readonly certificateGateway: CertificateGateway,
    ) {}

    async execute(): Promise<CertificateTemplateWithCount[]> {
        const templates = await this.templateGateway.findAll();
        return Promise.all(
            templates.map(async (t) => ({
                ...t,
                certificateCount: await this.certificateGateway.countByTemplateId(t.id),
            })),
        );
    }
}
