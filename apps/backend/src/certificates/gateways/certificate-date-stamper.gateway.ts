import { DateStamp } from '../value-objects';

export abstract class CertificateDateStamperGateway {
  /** Draws the date onto an already issued certificate PDF. */
  abstract stamp(pdf: Buffer, date: DateStamp): Promise<Buffer>;
}
