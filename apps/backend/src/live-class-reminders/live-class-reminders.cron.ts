import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SendLiveClassRemindersUseCase } from './use-cases/send-live-class-reminders.use-case';

@Injectable()
export class LiveClassRemindersCron {
  private readonly logger = new Logger(LiveClassRemindersCron.name);

  constructor(private readonly sendReminders: SendLiveClassRemindersUseCase) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run(): Promise<void> {
    const sent = await this.sendReminders.execute();
    if (sent > 0) this.logger.log(`${sent} aviso(s) de clase en vivo en cola.`);
  }
}
