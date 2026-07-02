import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduleEventGateway } from './gateways/schedule-event.gateway';
import { PushService } from '../push/push.service';

/** Hora HH:MM del evento para el cuerpo del aviso. */
function hhmm(d: Date): string {
  const date = d instanceof Date ? d : new Date(d);
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

/**
 * ReminderCronService — Cada minuto revisa la agenda y envía por web-push los
 * recordatorios que ya entraron en su ventana de aviso, marcándolos como
 * enviados para no repetirlos. Si el push no está configurado (sin VAPID),
 * no hace nada.
 */
@Injectable()
export class ReminderCronService {
  private readonly logger = new Logger(ReminderCronService.name);

  constructor(
    private readonly gateway: ScheduleEventGateway,
    private readonly push: PushService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async fireDueReminders(): Promise<void> {
    if (!this.push.isConfigured()) return;

    const now = new Date();
    const due = await this.gateway.findDueReminders(now);
    if (due.length === 0) return;

    for (const ev of due) {
      await this.push.sendToAll({
        title: 'Recordatorio de agenda',
        body: `${ev.title} — empieza a las ${hhmm(ev.startAt)}`,
        url: '/admin/agenda',
      });
      await this.gateway.update(ev.id, { reminderSentAt: now });
    }

    this.logger.log(`Enviado(s) ${due.length} recordatorio(s).`);
  }
}
