import { Injectable, BadRequestException } from '@nestjs/common';
import { CalendarSourceType } from '@maris-nails/shared';
import { ScheduleEventGateway } from '../gateways/schedule-event.gateway';
import { assertNoOverlap } from './schedule-conflict';

/**
 * UpsertLiveClassEventUseCase — Crea o actualiza el "espejo" de una clase en vivo
 * en la agenda.
 *
 * Lo usa el módulo de cursos cuando una lección en vivo se programa/edita. El
 * espejo (sourceType 'live_lesson', sourceId = lessonId) hace que la clase
 * aparezca en el calendario y participe de la regla anti-solape junto con los
 * eventos personales — todo en una sola tabla, un solo chequeo.
 */
@Injectable()
export class UpsertLiveClassEventUseCase {
  constructor(private readonly gateway: ScheduleEventGateway) {}

  async execute(
    lessonId: string,
    title: string,
    start: Date,
    end: Date,
  ): Promise<void> {
    if (end <= start) {
      throw new BadRequestException(
        'La clase en vivo: la hora de fin debe ser posterior a la de inicio.',
      );
    }

    const existing = await this.gateway.findBySource(lessonId);
    // Excluimos el propio espejo al revalidar (por si solo cambió el título).
    await assertNoOverlap(this.gateway, start, end, existing?.id);

    if (existing) {
      await this.gateway.update(existing.id, {
        title,
        startAt: start,
        endAt: end,
        allDay: false,
      });
    } else {
      await this.gateway.create({
        title,
        startAt: start,
        endAt: end,
        allDay: false,
        sourceType: CalendarSourceType.LIVE_LESSON,
        sourceId: lessonId,
      });
    }
  }
}
