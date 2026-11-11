import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { CertificateSearchCriteria } from '../gateways/certificate-search.gateway';

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const CERTIFICATE_ACCOUNT_FILTERS = ['linked', 'unlinked'] as const;
export type CertificateAccountFilter =
  (typeof CERTIFICATE_ACCOUNT_FILTERS)[number];

export class SearchCertificatesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  course?: string;

  @IsOptional()
  @Matches(CALENDAR_DATE, { message: 'from debe tener el formato YYYY-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'from no es una fecha válida' })
  from?: string;

  @IsOptional()
  @Matches(CALENDAR_DATE, { message: 'to debe tener el formato YYYY-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'to no es una fecha válida' })
  to?: string;

  @IsOptional()
  @IsIn(CERTIFICATE_ACCOUNT_FILTERS)
  account?: CertificateAccountFilter;

  toCriteria(): CertificateSearchCriteria {
    return {
      text: this.search?.trim() || undefined,
      courseAbbreviation: this.course || undefined,
      dateFrom: this.from,
      dateTo: this.to,
      linkedToAccount:
        this.account === undefined ? undefined : this.account === 'linked',
    };
  }
}
