import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CertificateGateway } from './gateways/certificate.gateway';
import {
  CertificateCourse,
  CertificateSearchCriteria,
  CertificateSearchGateway,
} from './gateways/certificate-search.gateway';
import { Certificate } from './entities/certificate.entity';
import { CertificateTemplate } from './entities/certificate-template.entity';

@Injectable()
export class CertificatesRepository
  implements CertificateGateway, CertificateSearchGateway
{
  constructor(
    @InjectRepository(Certificate)
    private readonly repo: Repository<Certificate>,
  ) {}

  async create(data: Partial<Certificate>): Promise<Certificate> {
    const cert = this.repo.create(data);
    return this.repo.save(cert);
  }

  async search(criteria: CertificateSearchCriteria): Promise<Certificate[]> {
    const query = this.repo
      .createQueryBuilder('cert')
      .orderBy('cert.issuedAt', 'DESC');

    if (criteria.text) {
      query.andWhere(
        '(cert.recipientName ILIKE :term OR cert.certificateNumber ILIKE :term)',
        { term: `%${criteria.text}%` },
      );
    }
    if (criteria.courseAbbreviation) {
      query.andWhere(
        `cert.templateSnapshot ->> 'courseAbbreviation' = :abbreviation`,
        { abbreviation: criteria.courseAbbreviation },
      );
    }
    if (criteria.dateFrom) {
      query.andWhere('cert.certificateDate >= :dateFrom', {
        dateFrom: criteria.dateFrom,
      });
    }
    if (criteria.dateTo) {
      query.andWhere('cert.certificateDate <= :dateTo', {
        dateTo: criteria.dateTo,
      });
    }
    if (criteria.linkedToAccount !== undefined) {
      query.andWhere(
        criteria.linkedToAccount
          ? 'cert.userId IS NOT NULL'
          : 'cert.userId IS NULL',
      );
    }

    return query.getMany();
  }

  // The most recent certificate names the course: an abbreviation may have
  // been issued under a template that was later renamed.
  async listCourses(): Promise<CertificateCourse[]> {
    return this.repo.query(
      `SELECT abbreviation, name FROM (
         SELECT DISTINCT ON ("templateSnapshot" ->> 'courseAbbreviation')
           "templateSnapshot" ->> 'courseAbbreviation' AS abbreviation,
           "templateSnapshot" ->> 'name' AS name
         FROM "certificates"
         ORDER BY "templateSnapshot" ->> 'courseAbbreviation', "issuedAt" DESC
       ) AS courses
       ORDER BY name`,
    );
  }

  async findOne(id: string): Promise<Certificate | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIds(ids: string[]): Promise<Certificate[]> {
    return this.repo.find({ where: { id: In(ids) } });
  }

  async findByNumber(certificateNumber: string): Promise<Certificate | null> {
    return this.repo.findOne({ where: { certificateNumber } });
  }

  /**
   * Certificados de un alumno (los que tienen su userId), más recientes primero.
   * NO cargamos la relación `user` a propósito: no la necesitamos y evita
   * serializar datos del usuario en la respuesta.
   */
  async findByUser(userId: string): Promise<Certificate[]> {
    return this.repo.find({
      where: { userId },
      order: { issuedAt: 'DESC' },
    });
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
      await this.repo.delete(certs.map((c) => c.id));
    }
    return certs;
  }

  async deleteMany(ids: string[]): Promise<void> {
    await this.repo.delete({ id: In(ids) });
  }
}
