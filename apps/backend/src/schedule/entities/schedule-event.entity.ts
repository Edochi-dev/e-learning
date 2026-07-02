import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * ScheduleEvent — Evento de la agenda del panel admin.
 *
 * La educadora lleva su horario digitalmente. Cada evento tiene un nombre libre
 * y un rango de horas. Regla de negocio: los eventos POR HORA no se solapan
 * (ver CreateScheduleEventUseCase); los `allDay` (multidía) son telón de fondo
 * y no bloquean, para poder poner cosas en otras horas dentro de esos días.
 *
 * `sourceType`:
 *   - 'personal'    → creado y editable desde la agenda.
 *   - 'live_lesson' → espejo de una clase en vivo programada (Fase 2). Se edita
 *                     desde su curso, no desde la agenda. `sourceId` = lessonId.
 *
 * Los campos `reminder*` quedan listos para las notificaciones (Fase 3, web-push
 * desde la PWA) sin necesidad de otra migración.
 */
@Entity('schedule_events')
export class ScheduleEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Index()
  @Column({ type: 'timestamp' })
  startAt: Date;

  @Column({ type: 'timestamp' })
  endAt: Date;

  @Column({ default: false })
  allDay: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ default: 'personal' })
  sourceType: string;

  @Column({ type: 'uuid', nullable: true })
  sourceId: string | null;

  @Column({ type: 'int', nullable: true })
  reminderMinutesBefore: number | null;

  @Column({ type: 'timestamp', nullable: true })
  reminderSentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
