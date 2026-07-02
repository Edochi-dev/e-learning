import { ScheduleEvent } from '../entities/schedule-event.entity';

/** Datos planos para crear/actualizar (el repo los vuelve entidad). */
export interface CreateScheduleEventData {
  title: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  notes?: string | null;
  reminderMinutesBefore?: number | null;
  sourceType?: string;
  sourceId?: string | null;
}

export interface UpdateScheduleEventData {
  title?: string;
  startAt?: Date;
  endAt?: Date;
  allDay?: boolean;
  notes?: string | null;
  reminderMinutesBefore?: number | null;
}

/**
 * ScheduleEventGateway — Contrato abstracto de persistencia de la agenda.
 * Clase abstracta (no interfaz) por el token de DI de NestJS.
 */
export abstract class ScheduleEventGateway {
  abstract create(data: CreateScheduleEventData): Promise<ScheduleEvent>;

  abstract findById(id: string): Promise<ScheduleEvent | null>;

  abstract update(
    id: string,
    data: UpdateScheduleEventData,
  ): Promise<ScheduleEvent>;

  abstract delete(id: string): Promise<void>;

  /** Eventos que caen dentro (o cruzan) el rango visible del calendario. */
  abstract findInRange(from: Date, to: Date): Promise<ScheduleEvent[]>;

  /** Espejo de una clase en vivo por su origen (sourceId = lessonId). */
  abstract findBySource(sourceId: string): Promise<ScheduleEvent | null>;

  /** Borra el espejo de una clase en vivo (al despublicar o borrar la lección). */
  abstract deleteBySource(sourceId: string): Promise<void>;

  /**
   * Eventos POR HORA que chocan con [start, end).
   * Excluye los `allDay` (no bloquean) y, opcionalmente, un id (al editar).
   */
  abstract findOverlapping(
    start: Date,
    end: Date,
    excludeId?: string,
  ): Promise<ScheduleEvent[]>;
}
