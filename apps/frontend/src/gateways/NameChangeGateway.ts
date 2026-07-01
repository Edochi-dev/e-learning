import type { NameChangeRequest } from '@maris-nails/shared';

/**
 * NameChangeGateway — Contrato del flujo de cambio de nombre por solicitud.
 *
 * Separado del AuthGateway (ISP): el cambio de nombre es su propio dominio
 * (solicitud → aprobación de admin), no una operación de sesión.
 */
export interface NameChangeGateway {
    // ── Alumno ──
    /** Solicita un cambio de nombre. Devuelve la solicitud creada (pending). */
    requestNameChange(requestedName: string): Promise<NameChangeRequest>;
    /** Última solicitud del alumno (o null si nunca pidió). Para estado + cooldown. */
    getMyRequest(): Promise<NameChangeRequest | null>;

    // ── Admin ──
    /** Cola de solicitudes pendientes de revisión. */
    listPending(): Promise<NameChangeRequest[]>;
    /** Aprueba o rechaza una solicitud, con feedback opcional. */
    review(
        id: string,
        action: 'approve' | 'reject',
        feedback?: string,
    ): Promise<NameChangeRequest>;
}
