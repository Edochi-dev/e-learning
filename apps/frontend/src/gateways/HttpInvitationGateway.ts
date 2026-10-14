import type { InvitationPreview } from '@maris-nails/shared';
import type {
    StudentInvitationGateway,
    AdminInvitationGateway,
    CourseInvitationRow,
    CreatedInvitation,
    RedeemInvitationData,
} from './InvitationGateway';
import type { HttpClient } from '../http/HttpClient';

/** Extrae el mensaje que mandó el backend, o uno por defecto si no lo hay. */
async function errorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const body = await response.json();
        return typeof body?.message === 'string' ? body.message : fallback;
    } catch {
        return fallback;
    }
}

/**
 * HttpInvitationGateway — Implementación HTTP de ambos contratos.
 *
 * Una sola clase para el recurso /invitations; cada página recibe solo la
 * interfaz que usa. La cookie HttpOnly viaja sola con credentials: 'include',
 * que además es lo que deja la sesión iniciada tras canjear.
 */
export class HttpInvitationGateway
    implements StudentInvitationGateway, AdminInvitationGateway
{
    private readonly baseUrl: string;
    private readonly http: HttpClient;

    constructor(baseUrl: string, http: HttpClient) {
        this.baseUrl = baseUrl;
        this.http = http;
    }

    async getPreview(token: string): Promise<InvitationPreview> {
        const response = await this.http.fetch(`${this.baseUrl}/invitations/${token}`);

        if (!response.ok) {
            throw new Error(
                await errorMessage(response, 'No pudimos leer esta invitación'),
            );
        }
        return response.json();
    }

    async redeem(token: string, data: RedeemInvitationData): Promise<void> {
        const response = await this.http.fetch(
            `${this.baseUrl}/invitations/${token}/redeem`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Imprescindible: la respuesta trae la cookie de sesión.
                credentials: 'include',
                body: JSON.stringify(data),
            },
        );

        if (!response.ok) {
            throw new Error(
                await errorMessage(response, 'No pudimos activar tu invitación'),
            );
        }
    }

    async claim(token: string): Promise<{ courseId: string }> {
        const response = await this.http.fetch(
            `${this.baseUrl}/invitations/${token}/claim`,
            { method: 'POST', credentials: 'include' },
        );

        if (!response.ok) {
            throw new Error(
                await errorMessage(response, 'No pudimos activar tu invitación'),
            );
        }
        return response.json();
    }

    // ── Administración ──

    async create(
        courseId: string,
        labels: string[],
        validityDays?: number,
    ): Promise<CreatedInvitation[]> {
        const response = await this.http.fetch(
            `${this.baseUrl}/invitations/course/${courseId}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(
                    validityDays === undefined
                        ? { labels }
                        : { labels, validityDays },
                ),
            },
        );

        if (!response.ok) {
            throw new Error(
                await errorMessage(response, 'No se pudieron generar las invitaciones'),
            );
        }
        return response.json();
    }

    async list(courseId: string): Promise<CourseInvitationRow[]> {
        const response = await this.http.fetch(
            `${this.baseUrl}/invitations/course/${courseId}`,
            { credentials: 'include' },
        );

        if (!response.ok) {
            throw new Error('No se pudieron cargar las invitaciones');
        }
        return response.json();
    }

    async revoke(id: string): Promise<void> {
        const response = await this.http.fetch(`${this.baseUrl}/invitations/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(
                await errorMessage(response, 'No se pudo revocar la invitación'),
            );
        }
    }
}
