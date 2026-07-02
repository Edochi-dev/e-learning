import { Injectable, BadRequestException } from '@nestjs/common';
import { ScheduleEventGateway } from '../gateways/schedule-event.gateway';
import { ScheduleEvent } from '../entities/schedule-event.entity';
import { CreateScheduleEventDto } from '../dto/create-schedule-event.dto';
import { assertNoOverlap } from './schedule-conflict';

/**
 * CreateScheduleEventUseCase — Crea un evento personal de la agenda.
 *
 * Valida que el fin sea posterior al inicio y, si NO es de todo el día, que no
 * se solape con otro evento por hora. Los eventos personales nacen con
 * sourceType 'personal'.
 */
@Injectable()
export class CreateScheduleEventUseCase {
  constructor(private readonly gateway: ScheduleEventGateway) {}

  async execute(dto: CreateScheduleEventDto): Promise<ScheduleEvent> {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    const allDay = dto.allDay ?? false;

    if (end <= start) {
      throw new BadRequestException(
        'La hora de fin debe ser posterior a la de inicio.',
      );
    }

    if (!allDay) {
      await assertNoOverlap(this.gateway, start, end);
    }

    return this.gateway.create({
      title: dto.title.trim(),
      startAt: start,
      endAt: end,
      allDay,
      notes: dto.notes ?? null,
      reminderMinutesBefore: dto.reminderMinutesBefore ?? null,
      sourceType: 'personal',
    });
  }
}
