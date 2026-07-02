import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CalendarSourceType } from '@maris-nails/shared';
import { ScheduleEventGateway } from '../gateways/schedule-event.gateway';
import { ScheduleEvent } from '../entities/schedule-event.entity';
import { UpdateScheduleEventDto } from '../dto/update-schedule-event.dto';
import { assertNoOverlap } from './schedule-conflict';

/**
 * UpdateScheduleEventUseCase — Edita/mueve/estira un evento personal.
 *
 * Solo eventos 'personal': los espejos de clases en vivo se editan desde su
 * curso, no desde la agenda. Revalida solape (excluyéndose a sí mismo).
 */
@Injectable()
export class UpdateScheduleEventUseCase {
  constructor(private readonly gateway: ScheduleEventGateway) {}

  async execute(
    id: string,
    dto: UpdateScheduleEventDto,
  ): Promise<ScheduleEvent> {
    const existing = await this.gateway.findById(id);
    if (!existing) {
      throw new NotFoundException('Evento no encontrado');
    }
    if (existing.sourceType !== CalendarSourceType.PERSONAL) {
      throw new BadRequestException(
        'Las clases en vivo se editan desde su curso, no desde la agenda.',
      );
    }

    const start = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const end = dto.endAt ? new Date(dto.endAt) : existing.endAt;
    const allDay = dto.allDay ?? existing.allDay;

    if (end <= start) {
      throw new BadRequestException(
        'La hora de fin debe ser posterior a la de inicio.',
      );
    }

    if (!allDay) {
      await assertNoOverlap(this.gateway, start, end, id);
    }

    return this.gateway.update(id, {
      title: dto.title?.trim(),
      startAt: dto.startAt ? start : undefined,
      endAt: dto.endAt ? end : undefined,
      allDay: dto.allDay,
      notes: dto.notes,
      reminderMinutesBefore: dto.reminderMinutesBefore,
    });
  }
}
