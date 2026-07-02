import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { ScheduleEventGateway } from './gateways/schedule-event.gateway';
import { ScheduleRepository } from './schedule.repository';
import { ScheduleController } from './schedule.controller';
import { CreateScheduleEventUseCase } from './use-cases/create-schedule-event.use-case';
import { UpdateScheduleEventUseCase } from './use-cases/update-schedule-event.use-case';
import { DeleteScheduleEventUseCase } from './use-cases/delete-schedule-event.use-case';
import { ListScheduleUseCase } from './use-cases/list-schedule.use-case';

/**
 * ScheduleModule — Agenda/calendario del panel admin.
 *
 * Exporta el ScheduleEventGateway para que, en la Fase 2, el módulo de cursos
 * pueda crear/actualizar los espejos de las clases en vivo programadas y que
 * la regla anti-solape las tenga en cuenta (una sola tabla = un solo chequeo).
 */
@Module({
  imports: [TypeOrmModule.forFeature([ScheduleEvent])],
  controllers: [ScheduleController],
  providers: [
    { provide: ScheduleEventGateway, useClass: ScheduleRepository },
    CreateScheduleEventUseCase,
    UpdateScheduleEventUseCase,
    DeleteScheduleEventUseCase,
    ListScheduleUseCase,
  ],
  exports: [ScheduleEventGateway],
})
export class ScheduleModule {}
