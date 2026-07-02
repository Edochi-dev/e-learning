import type { ScheduleEvent } from '@maris-nails/shared';
import type { ScheduleGateway, ScheduleEventInput } from './ScheduleGateway';

/**
 * HttpScheduleGateway — Implementación HTTP contra /schedule (solo admin).
 */
export class HttpScheduleGateway implements ScheduleGateway {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async list(from: string, to: string): Promise<ScheduleEvent[]> {
        const url = `${this.baseUrl}/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error('Error al cargar la agenda');
        return res.json();
    }

    async create(input: ScheduleEventInput): Promise<ScheduleEvent> {
        const res = await fetch(`${this.baseUrl}/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(input),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'No se pudo crear el evento');
        }
        return res.json();
    }

    async update(
        id: string,
        input: Partial<ScheduleEventInput>,
    ): Promise<ScheduleEvent> {
        const res = await fetch(`${this.baseUrl}/schedule/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(input),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'No se pudo actualizar el evento');
        }
        return res.json();
    }

    async remove(id: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/schedule/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok && res.status !== 204) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'No se pudo borrar el evento');
        }
    }
}
