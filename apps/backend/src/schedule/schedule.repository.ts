import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleEvent } from './entities/schedule-event.entity';
import {
  ScheduleEventGateway,
  CreateScheduleEventData,
  UpdateScheduleEventData,
} from './gateways/schedule-event.gateway';

/**
 * ScheduleRepository — Implementación TypeORM del ScheduleEventGateway.
 */
@Injectable()
export class ScheduleRepository implements ScheduleEventGateway {
  constructor(
    @InjectRepository(ScheduleEvent)
    private readonly repo: Repository<ScheduleEvent>,
  ) {}

  async create(data: CreateScheduleEventData): Promise<ScheduleEvent> {
    const entity = this.repo.create({
      title: data.title,
      startAt: data.startAt,
      endAt: data.endAt,
      allDay: data.allDay,
      notes: data.notes ?? null,
      reminderMinutesBefore: data.reminderMinutesBefore ?? null,
      sourceType: data.sourceType ?? 'personal',
      sourceId: data.sourceId ?? null,
    });
    return this.repo.save(entity);
  }

  async findById(id: string): Promise<ScheduleEvent | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(
    id: string,
    data: UpdateScheduleEventData,
  ): Promise<ScheduleEvent> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Schedule event ${id} not found`);
    }
    Object.assign(entity, data);
    return this.repo.save(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findBySource(sourceId: string): Promise<ScheduleEvent | null> {
    return this.repo.findOne({ where: { sourceId } });
  }

  async deleteBySource(sourceId: string): Promise<void> {
    await this.repo.delete({ sourceId });
  }

  /** Eventos que cruzan el rango visible: empiezan antes del fin y terminan después del inicio. */
  async findInRange(from: Date, to: Date): Promise<ScheduleEvent[]> {
    return this.repo
      .createQueryBuilder('e')
      .where('e.startAt < :to AND e.endAt > :from', { from, to })
      .orderBy('e.startAt', 'ASC')
      .getMany();
  }

  /**
   * Eventos POR HORA que se solapan con [start, end).
   * Dos intervalos chocan si start < otherEnd && otherStart < end.
   * Excluye all-day (no bloquean) y, opcionalmente, un id (al editar el propio).
   */
  async findOverlapping(
    start: Date,
    end: Date,
    excludeId?: string,
  ): Promise<ScheduleEvent[]> {
    const qb = this.repo
      .createQueryBuilder('e')
      .where('e.allDay = false')
      .andWhere('e.startAt < :end AND e.endAt > :start', { start, end });

    if (excludeId) {
      qb.andWhere('e.id != :excludeId', { excludeId });
    }

    return qb.orderBy('e.startAt', 'ASC').getMany();
  }
}
