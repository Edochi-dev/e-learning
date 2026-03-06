import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificateTemplateGateway } from './gateways/certificate-template.gateway';
import { CertificateTemplate } from './entities/certificate-template.entity';

@Injectable()
export class CertificateTemplatesRepository implements CertificateTemplateGateway {
    constructor(
        @InjectRepository(CertificateTemplate)
        private readonly repo: Repository<CertificateTemplate>,
    ) {}

    async create(data: Partial<CertificateTemplate>): Promise<CertificateTemplate> {
        const template = this.repo.create(data);
        return this.repo.save(template);
    }

    async findAll(): Promise<CertificateTemplate[]> {
        return this.repo.find({ order: { createdAt: 'DESC' } });
    }

    async findOne(id: string): Promise<CertificateTemplate | null> {
        return this.repo.findOne({ where: { id } });
    }

    async update(id: string, data: Partial<CertificateTemplate>): Promise<CertificateTemplate> {
        const template = await this.findOne(id);
        if (!template) throw new NotFoundException(`Plantilla ${id} no encontrada`);
        Object.assign(template, data);
        return this.repo.save(template);
    }

    async delete(id: string): Promise<void> {
        await this.repo.delete(id);
    }
}
