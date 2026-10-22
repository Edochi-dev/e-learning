import { DateStamp } from '../value-objects';

export abstract class CertificateDateStamperGateway {
  /** Draws the date onto a certificate PDF: an issued one, or a bare template. */
  abstract stamp(pdf: Buffer, date: DateStamp): Promise<Buffer>;
}
