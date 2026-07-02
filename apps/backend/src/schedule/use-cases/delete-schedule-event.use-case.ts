import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CalendarSourceType } from '@maris-nails/shared';
import { ScheduleEventGateway } from '../gateways/schedule-event.gateway';

/**
 * DeleteScheduleEventUseCase — Borra un evento personal de la agenda.
 * Los espejos de clases en vivo no se borran aquí (se gestionan desde el curso).
 */
@Injectable()
export class DeleteScheduleEventUseCase {
  constructor(private readonly gateway: ScheduleEventGateway) {}

  async execute(id: string): Promise<void> {
    const existing = await this.gateway.findById(id);
    if (!existing) {
      throw new NotFoundException('Evento no encontrado');
    }
    if (existing.sourceType !== CalendarSourceType.PERSONAL) {
      throw new BadRequestException(
        'Las clases en vivo se quitan desde su curso, no desde la agenda.',
      );
    }
    await this.gateway.delete(id);
  }
}
