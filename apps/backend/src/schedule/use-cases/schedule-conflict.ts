import { BadRequestException } from '@nestjs/common';
import { ScheduleEventGateway } from '../gateways/schedule-event.gateway';

/** Formatea la hora (HH:MM) de un evento para el mensaje de conflicto. */
function hhmm(d: Date): string {
  const date = d instanceof Date ? d : new Date(d);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * assertNoOverlap — Regla de negocio compartida por crear y actualizar.
 *
 * Un evento POR HORA no puede solaparse con otro evento por hora existente.
 * Los `allDay` no participan (son telón de fondo). Si hay choque, lanza un
 * error claro indicando con qué evento y en qué horas.
 */
export async function assertNoOverlap(
  gateway: ScheduleEventGateway,
  start: Date,
  end: Date,
  excludeId?: string,
): Promise<void> {
  const conflicts = await gateway.findOverlapping(start, end, excludeId);
  if (conflicts.length > 0) {
    const c = conflicts[0];
    throw new BadRequestException(
      `Se solapa con "${c.title}" (${hhmm(c.startAt)}–${hhmm(c.endAt)}). ` +
        `Elige otro horario.`,
    );
  }
}
