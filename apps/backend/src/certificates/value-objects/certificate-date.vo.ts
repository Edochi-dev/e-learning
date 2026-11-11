const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Calendar date printed on a certificate. Kept as a plain YYYY-MM-DD string
 * (never a Date) so no timezone conversion can shift it by a day.
 */
export class CertificateDate {
  private constructor(private readonly iso: string) {}

  static fromIso(value: string): CertificateDate {
    const match = ISO_DATE.exec(value);
    if (!match) throw new Error(`Invalid certificate date: ${value}`);
    const [, y, m, d] = match.map(Number);
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (
      probe.getUTCFullYear() !== y ||
      probe.getUTCMonth() !== m - 1 ||
      probe.getUTCDate() !== d
    ) {
      throw new Error(`Invalid certificate date: ${value}`);
    }
    return new CertificateDate(value);
  }

  toIso(): string {
    return this.iso;
  }

  toDisplay(): string {
    const [yyyy, mm, dd] = this.iso.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
}
