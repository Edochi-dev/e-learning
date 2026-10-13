import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SearchCertificatesUseCase } from './search-certificates.use-case';
import { CertificateSearchGateway } from '../gateways/certificate-search.gateway';

describe('SearchCertificatesUseCase', () => {
  let useCase: SearchCertificatesUseCase;
  let search: jest.Mock;

  beforeEach(async () => {
    search = jest.fn().mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        SearchCertificatesUseCase,
        {
          provide: CertificateSearchGateway,
          useValue: { search, listCourses: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(SearchCertificatesUseCase);
  });

  it('delega los criterios al gateway sin alterarlos', async () => {
    const criteria = {
      text: 'Ana',
      courseAbbreviation: 'MEP',
      dateFrom: '2026-01-01',
      dateTo: '2026-03-31',
      linkedToAccount: false,
    };

    await useCase.execute(criteria);

    expect(search).toHaveBeenCalledWith(criteria);
  });

  it('rechaza un rango con "desde" posterior a "hasta"', async () => {
    await expect(
      useCase.execute({ dateFrom: '2026-05-02', dateTo: '2026-05-01' }),
    ).rejects.toThrow(BadRequestException);
    expect(search).not.toHaveBeenCalled();
  });

  it('acepta un rango de un solo día y rangos abiertos', async () => {
    await useCase.execute({ dateFrom: '2026-05-01', dateTo: '2026-05-01' });
    await useCase.execute({ dateFrom: '2026-05-01' });
    await useCase.execute({ dateTo: '2026-05-01' });

    expect(search).toHaveBeenCalledTimes(3);
  });
});
