import { Certificate } from '../entities/certificate.entity';

export abstract class CertificateGateway {
    abstract create(data: Partial<Certificate>): Promise<Certificate>;
    abstract findAll(): Promise<Certificate[]>;
    abstract findOne(id: string): Promise<Certificate | null>;
    abstract countByAbbreviation(abbreviation: string): Promise<number>;
}
