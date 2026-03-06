import { Certificate } from '../entities/certificate.entity';

export abstract class CertificateGateway {
    abstract create(data: Partial<Certificate>): Promise<Certificate>;
    abstract findAll(): Promise<Certificate[]>;
    abstract findOne(id: string): Promise<Certificate | null>;
    abstract countByAbbreviation(abbreviation: string): Promise<number>;
    abstract findByTemplateId(templateId: string): Promise<Certificate[]>;
    abstract countByTemplateId(templateId: string): Promise<number>;
    abstract unlinkAllFromTemplate(templateId: string): Promise<void>;
    abstract deleteAllByTemplateId(templateId: string): Promise<Certificate[]>;
    abstract delete(id: string): Promise<void>;
}
