import { Certificate } from '../entities/certificate.entity';

export abstract class CertificateGateway {
  abstract create(data: Partial<Certificate>): Promise<Certificate>;
  abstract findOne(id: string): Promise<Certificate | null>;
  abstract findByIds(ids: string[]): Promise<Certificate[]>;
  abstract findByNumber(certificateNumber: string): Promise<Certificate | null>;
  abstract findByUser(userId: string): Promise<Certificate[]>;
  abstract findByTemplateId(templateId: string): Promise<Certificate[]>;
  abstract countByTemplateId(templateId: string): Promise<number>;
  abstract unlinkAllFromTemplate(templateId: string): Promise<void>;
  abstract deleteAllByTemplateId(templateId: string): Promise<Certificate[]>;
  abstract deleteMany(ids: string[]): Promise<void>;
}
