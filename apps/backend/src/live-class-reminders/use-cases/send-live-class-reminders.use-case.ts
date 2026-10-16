import { Injectable } from '@nestjs/common';
import {
  LIVE_JOIN_LEAD_MINUTES,
  LIVE_REMINDER_LEAD_MINUTES,
} from '@maris-nails/shared';
import { LiveClassReminderGateway } from '../gateways/live-class-reminder.gateway';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';
import { EmailPriority } from '../../notifications/domain/email-priority';
import { html } from '../../notifications/templates/safe-html';
import { startsInText } from '../domain/starts-in';

/**
 * Emails every student enrolled in a course before each of its live classes.
 * Sent to all of them, not only to those who tapped "Avísame" on the class
 * page: that button only reassures; nobody should miss a class for not tapping it.
 */
@Injectable()
export class SendLiveClassRemindersUseCase {
  constructor(
    private readonly reminders: LiveClassReminderGateway,
    private readonly notifications: NotificationGateway,
  ) {}

  /** Returns how many reminders were queued. */
  async execute(now: Date = new Date()): Promise<number> {
    const due = await this.reminders.claimDue(now, LIVE_REMINDER_LEAD_MINUTES);

    for (const reminder of due) {
      const startsIn = startsInText(reminder.startsAt, now);
      const firstName = reminder.fullName.trim().split(/\s+/)[0];
      const subject = `Tu clase en vivo empieza en ${startsIn}`;

      await this.notifications.sendEmail(
        {
          to: reminder.email,
          subject,
          content: {
            preheader: `${reminder.lessonTitle} · ${reminder.courseTitle}`,
            heading: subject,
            body: html`<p>Hola ${firstName}:</p>
              <p>
                La clase <strong>${reminder.lessonTitle}</strong> de
                ${reminder.courseTitle} empieza en ${startsIn}. La sala se abre
                ${LIVE_JOIN_LEAD_MINUTES} minutos antes.
              </p>`,
            action: {
              label: 'Entrar a la clase',
              path: `/courses/${reminder.courseId}/learn?leccion=${reminder.lessonId}`,
            },
            footnote: 'Recibes este aviso porque estás inscrita en el curso.',
          },
        },
        EmailPriority.NORMAL,
      );
    }
    return due.length;
  }
}
