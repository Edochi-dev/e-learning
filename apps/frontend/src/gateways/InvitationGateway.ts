import type { InvitationPreview, InvitationStatus } from '@maris-nails/shared';

/** Invitación tal como la ve la profesora en su panel. Nunca incluye el token. */
export interface CourseInvitationRow {
    id: string;
    label: string | null;
    status: InvitationStatus;
    expiresAt: string;
    createdAt: string;
    redeemedAt: string | null;
    redeemedBy: { fullName: string; email: string } | null;
}

/** Invitación recién creada: el token en claro llega SOLO aquí. */
export interface CreatedInvitation {
    id: string;
    token: string;
    label: string | null;
    expiresAt: string;
}

export interface RedeemInvitationData {
    fullName: string;
    email: string;
    password: string;
}

/**
 * Lo que necesita quien abre un enlace de invitación.
 *
 * Separado del contrato de administración (ISP): la página pública de canje no
 * debe siquiera poder listar ni generar invitaciones.
 */
export interface StudentInvitationGateway {
    /** Lee el enlace SIN gastarlo. */
    getPreview(token: string): Promise<InvitationPreview>;

    /** Crea la cuenta, matricula y deja la sesión iniciada. */
    redeem(token: string, data: RedeemInvitationData): Promise<void>;

    /** Para quien ya tiene cuenta: solo añade el curso. */
    claim(token: string): Promise<{ courseId: string }>;
}

export interface AdminInvitationGateway {
    create(
        courseId: string,
        labels: string[],
        validityDays?: number,
    ): Promise<CreatedInvitation[]>;

    list(courseId: string): Promise<CourseInvitationRow[]>;

    revoke(id: string): Promise<void>;
}
