import { Injectable } from '@nestjs/common';
import { ScheduleEventGateway } from '../gateways/schedule-event.gateway';
import { ScheduleEvent } from '../entities/schedule-event.entity';

/**
 * ListScheduleUseCase — Eventos del calendario dentro de un rango (mes/semana/día).
 */
@Injectable()
export class ListScheduleUseCase {
  constructor(private readonly gateway: ScheduleEventGateway) {}

  execute(from: Date, to: Date): Promise<ScheduleEvent[]> {
    return this.gateway.findInRange(from, to);
  }
}
