import { Enrollment } from './enrollment.entity';

/**
 * Enrollment.isActive() es la única definición de "acceso vigente" del dominio.
 * Estos tests la fijan: si alguien la relaja, aquí se rompe.
 */
describe('Enrollment.isActive', () => {
  const now = new Date('2026-08-17T12:00:00.000Z');

  const buildEnrollment = (expiresAt: Date | null): Enrollment => {
    const enrollment = new Enrollment();
    enrollment.expiresAt = expiresAt;
    return enrollment;
  };

  it('está activa indefinidamente cuando no tiene vencimiento', () => {
    expect(buildEnrollment(null).isActive(now)).toBe(true);
  });

  it('está activa mientras el vencimiento sea futuro', () => {
    const tomorrow = new Date('2026-08-18T12:00:00.000Z');
    expect(buildEnrollment(tomorrow).isActive(now)).toBe(true);
  });

  it('deja de estar activa cuando el vencimiento ya pasó', () => {
    const yesterday = new Date('2026-08-16T12:00:00.000Z');
    expect(buildEnrollment(yesterday).isActive(now)).toBe(false);
  });

  it('deja de estar activa en el instante exacto del vencimiento', () => {
    expect(buildEnrollment(new Date(now)).isActive(now)).toBe(false);
  });
});

describe('Enrollment.daysRemaining', () => {
  const now = new Date('2026-08-17T12:00:00.000Z');

  const buildEnrollment = (expiresAt: Date | null): Enrollment => {
    const enrollment = new Enrollment();
    enrollment.expiresAt = expiresAt;
    return enrollment;
  };

  it('devuelve null cuando el acceso es permanente', () => {
    expect(buildEnrollment(null).daysRemaining(now)).toBeNull();
  });

  it('devuelve 0 cuando ya venció', () => {
    const yesterday = new Date('2026-08-16T12:00:00.000Z');
    expect(buildEnrollment(yesterday).daysRemaining(now)).toBe(0);
  });

  it('cuenta los días completos que faltan', () => {
    const inThreeDays = new Date('2026-08-20T12:00:00.000Z');
    expect(buildEnrollment(inThreeDays).daysRemaining(now)).toBe(3);
  });

  it('redondea hacia arriba: un resto de horas cuenta como un día', () => {
    // Quedan 2 h. Mostrar "0 días" a quien todavía tiene acceso sería mentir.
    const inTwoHours = new Date('2026-08-17T14:00:00.000Z');
    expect(buildEnrollment(inTwoHours).daysRemaining(now)).toBe(1);
  });
});
