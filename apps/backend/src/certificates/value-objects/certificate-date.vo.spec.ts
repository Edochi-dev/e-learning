import { CertificateDate } from './certificate-date.vo';

describe('CertificateDate', () => {
  it('formatea YYYY-MM-DD como DD/MM/YYYY', () => {
    expect(CertificateDate.fromIso('2026-01-05').toDisplay()).toBe(
      '05/01/2026',
    );
  });

  it('conserva el ISO original sin desplazarlo por zona horaria', () => {
    expect(CertificateDate.fromIso('2026-12-31').toIso()).toBe('2026-12-31');
  });

  it('rechaza formatos que no son YYYY-MM-DD', () => {
    expect(() => CertificateDate.fromIso('15/10/2026')).toThrow();
    expect(() => CertificateDate.fromIso('2026-10-15T00:00:00Z')).toThrow();
  });

  it('rechaza fechas de calendario inexistentes', () => {
    expect(() => CertificateDate.fromIso('2026-02-30')).toThrow();
    expect(() => CertificateDate.fromIso('2026-13-01')).toThrow();
  });

  it('today() usa la fecha local del reloj recibido', () => {
    expect(CertificateDate.today(new Date(2026, 9, 8, 23, 59)).toIso()).toBe(
      '2026-10-08',
    );
  });
});
