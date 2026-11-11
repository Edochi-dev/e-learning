import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CertificateSearchCriteria,
  CertificateSearchGateway,
} from '../gateways/certificate-search.gateway';
import { Certificate } from '../entities/certificate.entity';

@Injectable()
export class SearchCertificatesUseCase {
  constructor(private readonly searchGateway: CertificateSearchGateway) {}

  async execute(criteria: CertificateSearchCriteria): Promise<Certificate[]> {
    if (
      criteria.dateFrom &&
      criteria.dateTo &&
      criteria.dateFrom > criteria.dateTo
    ) {
      throw new BadRequestException(
        'La fecha "desde" no puede ser posterior a la fecha "hasta".',
      );
    }

    return this.searchGateway.search(criteria);
  }
}
