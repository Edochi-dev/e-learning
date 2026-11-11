export abstract class CertificateNumberSequenceGateway {
  /** Reserves and returns the next number for the abbreviation, atomically. */
  abstract next(abbreviation: string): Promise<number>;
}
