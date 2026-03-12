import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificateGateway } from './gateways/certificate.gateway';
import { Certificate } from './entities/certificate.entity';
import { CertificateTemplate } from './entities/certificate-template.entity';

@Injectable()
export class CertificatesRepository implements CertificateGateway {
    constructor(
        @InjectRepository(Certificate)
        private readonly repo: Repository<Certificate>,
    ) {}

    async create(data: Partial<Certificate>): Promise<Certificate> {
        const cert = this.repo.create(data);
        return this.repo.save(cert);
    }

    async findAll(): Promise<Certificate[]> {
        return this.repo.find({ order: { issuedAt: 'DESC' } });
    }

    async search(query: string): Promise<Certificate[]> {
        const term = `%${query}%`;
        return this.repo
            .createQueryBuilder('cert')
            .where('cert.recipientName ILIKE :term OR cert.certificateNumber ILIKE :term', { term })
            .orderBy('cert.issuedAt', 'DESC')
            .getMany();
    }

    async findOne(id: string): Promise<Certificate | null> {
        return this.repo.findOne({ where: { id } });
    }

    async findByNumber(certificateNumber: string): Promise<Certificate | null> {
        return this.repo.findOne({ where: { certificateNumber } });
    }

    async countByAbbreviation(abbreviation: string): Promise<number> {
        // Cuenta todos los certificados cuyo número empieza con la abreviatura dada.
        // Ej: "MR-" → cuenta MR-00001, MR-00002, etc.
        return this.repo
            .createQueryBuilder('cert')
            .where('cert.certificateNumber LIKE :prefix', { prefix: `${abbreviation}-%` })
            .getCount();
    }

    async findByTemplateId(templateId: string): Promise<Certificate[]> {
        return this.repo.find({ where: { template: { id: templateId } } });
    }

    async countByTemplateId(templateId: string): Promise<number> {
        return this.repo.count({ where: { template: { id: templateId } } });
    }

    async unlinkAllFromTemplate(templateId: string): Promise<void> {
        await this.repo
            .createQueryBuilder()
            .update(Certificate)
            .set({ template: null as unknown as CertificateTemplate })
            .where('"templateId" = :templateId', { templateId })
            .execute();
    }

    async deleteAllByTemplateId(templateId: string): Promise<Certificate[]> {
        const certs = await this.findByTemplateId(templateId);
        if (certs.length > 0) {
            await this.repo.delete(certs.map(c => c.id));
        }
        return certs;
    }

    async delete(id: string): Promise<void> {
        await this.repo.delete(id);
    }
}
