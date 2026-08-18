import { InvitationStatus } from '@maris-nails/shared';
import { CourseInvitation } from './course-invitation.entity';

/**
 * status() decide si un enlace sirve. Es la regla que separa "puedes entrar" de
 * "este enlace ya no vale", así que se fija aquí.
 */
describe('CourseInvitation.status', () => {
  const now = new Date('2026-08-17T12:00:00.000Z');
  const tomorrow = new Date('2026-08-18T12:00:00.000Z');
  const yesterday = new Date('2026-08-16T12:00:00.000Z');

  const build = (overrides: Partial<CourseInvitation>): CourseInvitation =>
    Object.assign(new CourseInvitation(), {
      expiresAt: tomorrow,
      redeemedAt: null,
      revokedAt: null,
      ...overrides,
    });

  it('es válido mientras no se haya usado, revocado ni caducado', () => {
    expect(build({}).status(now)).toBe(InvitationStatus.VALID);
    expect(build({}).isRedeemable(now)).toBe(true);
  });

  it('queda canjeado en cuanto se usa', () => {
    const invitation = build({ redeemedAt: yesterday });
    expect(invitation.status(now)).toBe(InvitationStatus.REDEEMED);
    expect(invitation.isRedeemable(now)).toBe(false);
  });

  it('queda revocado si la profesora lo anula', () => {
    expect(build({ revokedAt: yesterday }).status(now)).toBe(
      InvitationStatus.REVOKED,
    );
  });

  it('caduca cuando pasa su fecha', () => {
    expect(build({ expiresAt: yesterday }).status(now)).toBe(
      InvitationStatus.EXPIRED,
    );
  });

  it('caduca en el instante exacto del vencimiento', () => {
    expect(build({ expiresAt: new Date(now) }).status(now)).toBe(
      InvitationStatus.EXPIRED,
    );
  });

  /**
   * Un enlace usado y además caducado se reporta como CANJEADO: quien lo abre
   * necesita saber que ya lo gastó, no que se le pasó el plazo.
   */
  it('prioriza "canjeado" sobre "caducado" cuando se dan los dos', () => {
    const invitation = build({
      redeemedAt: yesterday,
      expiresAt: yesterday,
    });
    expect(invitation.status(now)).toBe(InvitationStatus.REDEEMED);
  });
});
