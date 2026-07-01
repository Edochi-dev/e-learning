import type { NameChangeRequest } from '@maris-nails/shared';

/**
 * Contratos del flujo de cambio de nombre, segregados por consumidor (ISP).
 *
 * Ningún consumidor usa las cuatro operaciones: el alumno solo solicita y
 * consulta lo suyo; el admin solo lista y revisa la cola. Separarlos en dos
 * interfaces evita que una página dependa de métodos que no usa.
 *
 * La implementación HTTP concreta (HttpNameChangeGateway) cumple ambas, porque
 * todo vive bajo el mismo recurso /name-change-requests.
 */

/** Operaciones del ALUMNO sobre su propio cambio de nombre. */
export interface StudentNameChangeGateway {
    /** Solicita un cambio de nombre. Devuelve la solicitud creada (pending). */
    requestNameChange(requestedName: string): Promise<NameChangeRequest>;
    /** Última solicitud del alumno (o null si nunca pidió). Para estado + cooldown. */
    getMyRequest(): Promise<NameChangeRequest | null>;
}

/** Operaciones del ADMIN sobre la cola de solicitudes. */
export interface AdminNameChangeGateway {
    /** Cola de solicitudes pendientes de revisión. */
    listPending(): Promise<NameChangeRequest[]>;
    /** Aprueba o rechaza una solicitud, con feedback opcional. */
    review(
        id: string,
        action: 'approve' | 'reject',
        feedback?: string,
    ): Promise<NameChangeRequest>;
}
