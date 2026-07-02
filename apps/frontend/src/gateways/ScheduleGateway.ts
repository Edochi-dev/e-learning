import type { ScheduleEvent } from '@maris-nails/shared';

/** Datos para crear/editar un evento de la agenda (fechas en ISO/wall-clock). */
export interface ScheduleEventInput {
    title: string;
    startAt: string;
    endAt: string;
    allDay?: boolean;
    notes?: string;
}

/**
 * ScheduleGateway — Contrato del frontend para la agenda del panel admin.
 */
export interface ScheduleGateway {
    /** Eventos del rango visible del calendario. */
    list(from: string, to: string): Promise<ScheduleEvent[]>;
    create(input: ScheduleEventInput): Promise<ScheduleEvent>;
    update(id: string, input: Partial<ScheduleEventInput>): Promise<ScheduleEvent>;
    remove(id: string): Promise<void>;
}
