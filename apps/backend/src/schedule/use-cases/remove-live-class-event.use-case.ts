import { Injectable } from '@nestjs/common';
import { ScheduleEventGateway } from '../gateways/schedule-event.gateway';

/**
 * RemoveLiveClassEventUseCase — Quita el espejo de una clase en vivo de la
 * agenda (cuando la lección deja de ser en vivo o se borra). Idempotente: si no
 * hay espejo, no pasa nada.
 */
@Injectable()
export class RemoveLiveClassEventUseCase {
  constructor(private readonly gateway: ScheduleEventGateway) {}

  execute(lessonId: string): Promise<void> {
    return this.gateway.deleteBySource(lessonId);
  }
}
