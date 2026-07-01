import type { NameChangeRequest } from '@maris-nails/shared';
import type { NameChangeGateway } from './NameChangeGateway';

/**
 * HttpNameChangeGateway — Implementación HTTP del NameChangeGateway.
 *
 * Habla con los endpoints de /name-change-requests del backend. La cookie
 * HttpOnly viaja sola con credentials: 'include'.
 */
export class HttpNameChangeGateway implements NameChangeGateway {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async requestNameChange(requestedName: string): Promise<NameChangeRequest> {
        const res = await fetch(`${this.baseUrl}/name-change-requests`, {
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
        const res = await fetch(`${this.baseUrl}/name-change-requests/me`, {
            credentials: 'include',
        });
        if (!res.ok) return null;
        // El backend devuelve el body "null" si el alumno nunca solicitó.
        return res.json();
    }

    async listPending(): Promise<NameChangeRequest[]> {
        const res = await fetch(`${this.baseUrl}/name-change-requests/pending`, {
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
        const res = await fetch(`${this.baseUrl}/name-change-requests/${id}/review`, {
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
