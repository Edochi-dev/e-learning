import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@maris-nails/shared';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateScheduleEventUseCase } from './use-cases/create-schedule-event.use-case';
import { UpdateScheduleEventUseCase } from './use-cases/update-schedule-event.use-case';
import { DeleteScheduleEventUseCase } from './use-cases/delete-schedule-event.use-case';
import { ListScheduleUseCase } from './use-cases/list-schedule.use-case';
import { CreateScheduleEventDto } from './dto/create-schedule-event.dto';
import { UpdateScheduleEventDto } from './dto/update-schedule-event.dto';
import { ScheduleEvent } from './entities/schedule-event.entity';

/**
 * ScheduleController — Agenda del panel admin (solo ADMIN).
 *
 *   GET    /schedule?from=&to=  → eventos del rango visible del calendario
 *   POST   /schedule           → crear evento
 *   PATCH  /schedule/:id        → editar/mover/estirar
 *   DELETE /schedule/:id        → borrar
 */
@Controller('schedule')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class ScheduleController {
  constructor(
    private readonly createUseCase: CreateScheduleEventUseCase,
    private readonly updateUseCase: UpdateScheduleEventUseCase,
    private readonly deleteUseCase: DeleteScheduleEventUseCase,
    private readonly listUseCase: ListScheduleUseCase,
  ) {}

  @Get()
  async list(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ScheduleEvent[]> {
    if (!from || !to) {
      throw new BadRequestException(
        'Se requieren los parámetros "from" y "to".',
      );
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Rango de fechas inválido.');
    }
    return this.listUseCase.execute(fromDate, toDate);
  }

  @Post()
  create(@Body() dto: CreateScheduleEventDto): Promise<ScheduleEvent> {
    return this.createUseCase.execute(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleEventDto,
  ): Promise<ScheduleEvent> {
    return this.updateUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteUseCase.execute(id);
  }
}
