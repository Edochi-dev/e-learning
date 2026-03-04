import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificateGateway } from './gateways/certificate.gateway';
import { Certificate } from './entities/certificate.entity';

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

    async findOne(id: string): Promise<Certificate | null> {
        return this.repo.findOne({ where: { id } });
    }

    async countByAbbreviation(abbreviation: string): Promise<number> {
        // Cuenta todos los certificados cuyo número empieza con la abreviatura dada.
        // Ej: "MR-" → cuenta MR-00001, MR-00002, etc.
        return this.repo
            .createQueryBuilder('cert')
            .where('cert.certificateNumber LIKE :prefix', { prefix: `${abbreviation}-%` })
            .getCount();
    }
}
