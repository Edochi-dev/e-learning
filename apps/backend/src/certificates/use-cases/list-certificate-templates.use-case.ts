import { Injectable } from '@nestjs/common';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';

@Injectable()
export class ListCertificateTemplatesUseCase {
    constructor(private readonly templateGateway: CertificateTemplateGateway) {}

    async execute(): Promise<CertificateTemplate[]> {
        return this.templateGateway.findAll();
    }
}
