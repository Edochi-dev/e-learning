import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthSessionGateway } from './gateways/auth-session.gateway';

const RETENTION_DAYS = 7;

/** Deletes dead sessions once a day so the table only holds recent history. */
@Injectable()
export class SessionCleanupCron {
  private readonly logger = new Logger(SessionCleanupCron.name);

  constructor(private readonly sessions: AuthSessionGateway) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async purge(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const deleted = await this.sessions.deleteStale(cutoff);
    if (deleted > 0)
      this.logger.log(`${deleted} sesión(es) vencida(s) borrada(s)`);
  }
}
