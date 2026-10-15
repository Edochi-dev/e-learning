import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RemindPendingCorrectionsUseCase } from './use-cases/remind-pending-corrections.use-case';

// Business hours in Chile, regardless of the server's own timezone.
const MORNING_AND_EVENING = '0 10,18 * * *';

@Injectable()
export class PendingCorrectionsReminderCron {
  constructor(private readonly remind: RemindPendingCorrectionsUseCase) {}

  @Cron(MORNING_AND_EVENING, { timeZone: 'America/Santiago' })
  async run(): Promise<void> {
    await this.remind.execute();
  }
}
