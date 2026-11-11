import type { NameChangeRequest } from '@maris-nails/shared';
import type {
    StudentNameChangeGateway,
    AdminNameChangeGateway,
} from './NameChangeGateway';
import type { HttpClient } from '../http/HttpClient';
import { readOptionalJson } from '../http/read-optional-json';

/**
 * HttpNameChangeGateway — Implementación HTTP de ambos contratos.
 *
 * Cumple StudentNameChangeGateway y AdminNameChangeGateway: una sola clase para
 * el recurso /name-change-requests. Cada página recibe solo la interfaz que usa
 * (ISP), pero la instancia concreta es única. La cookie HttpOnly viaja sola con
 * credentials: 'include'.
 */
export class HttpNameChangeGateway
    implements StudentNameChangeGateway, AdminNameChangeGateway
{
    private readonly baseUrl: string;
    private readonly http: HttpClient;

    constructor(baseUrl: string, http: HttpClient) {
        this.baseUrl = baseUrl;
        this.http = http;
    }

    async requestNameChange(requestedName: string): Promise<NameChangeRequest> {
        const res = await this.http.fetch(`${this.baseUrl}/name-change-requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ requestedName }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'No se pudo enviar la solicitud.');
        }
        return res.json();
    }

    async getMyRequest(): Promise<NameChangeRequest | null> {
        const res = await this.http.fetch(`${this.baseUrl}/name-change-requests/me`, {
            credentials: 'include',
        });
        if (!res.ok) return null;
        return readOptionalJson<NameChangeRequest>(res);
    }

    async listPending(): Promise<NameChangeRequest[]> {
        const res = await this.http.fetch(`${this.baseUrl}/name-change-requests/pending`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Error al cargar las solicitudes pendientes');
        return res.json();
    }

    async review(
        id: string,
        action: 'approve' | 'reject',
        feedback?: string,
    ): Promise<NameChangeRequest> {
        const res = await this.http.fetch(`${this.baseUrl}/name-change-requests/${id}/review`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action, feedback }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'No se pudo procesar la solicitud.');
        }
        return res.json();
    }
}
