import { plainToInstance } from 'class-transformer';
import { SearchCertificatesQueryDto } from './search-certificates-query.dto';

const toCriteria = (query: Record<string, string>) =>
  plainToInstance(SearchCertificatesQueryDto, query).toCriteria();

describe('SearchCertificatesQueryDto.toCriteria', () => {
  it('sin parámetros no filtra nada', () => {
    expect(toCriteria({})).toEqual({
      text: undefined,
      courseAbbreviation: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      linkedToAccount: undefined,
    });
  });

  it('traduce la consulta HTTP a criterios de dominio', () => {
    expect(
      toCriteria({
        search: '  Ana  ',
        course: 'MEP',
        from: '2026-01-01',
        to: '2026-03-31',
        account: 'unlinked',
      }),
    ).toEqual({
      text: 'Ana',
      courseAbbreviation: 'MEP',
      dateFrom: '2026-01-01',
      dateTo: '2026-03-31',
      linkedToAccount: false,
    });
  });

  it('un texto de solo espacios no filtra', () => {
    expect(toCriteria({ search: '   ', account: 'linked' })).toEqual(
      expect.objectContaining({ text: undefined, linkedToAccount: true }),
    );
  });
});
