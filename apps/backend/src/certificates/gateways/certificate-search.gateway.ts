import { Certificate } from '../entities/certificate.entity';

export interface CertificateSearchCriteria {
  /** Matches the holder's name or the certificate number. */
  text?: string;
  /** From the frozen templateSnapshot, so it survives template edits and deletions. */
  courseAbbreviation?: string;
  /** Inclusive bounds on certificateDate (YYYY-MM-DD). */
  dateFrom?: string;
  dateTo?: string;
  linkedToAccount?: boolean;
}

export interface CertificateCourse {
  abbreviation: string;
  name: string;
}

export abstract class CertificateSearchGateway {
  abstract search(criteria: CertificateSearchCriteria): Promise<Certificate[]>;
  /** Courses that have issued at least one certificate. */
  abstract listCourses(): Promise<CertificateCourse[]>;
}
