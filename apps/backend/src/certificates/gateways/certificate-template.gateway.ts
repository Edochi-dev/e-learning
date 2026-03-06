import { CertificateTemplate } from '../entities/certificate-template.entity';

export abstract class CertificateTemplateGateway {
    abstract create(data: Partial<CertificateTemplate>): Promise<CertificateTemplate>;
    abstract findAll(): Promise<CertificateTemplate[]>;
    abstract findOne(id: string): Promise<CertificateTemplate | null>;
    abstract update(id: string, data: Partial<CertificateTemplate>): Promise<CertificateTemplate>;
    abstract delete(id: string): Promise<void>;
}
