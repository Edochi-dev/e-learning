import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { LiveClassReminder } from './entities/live-class-reminder.entity';
import { LiveClassReminderGateway } from './gateways/live-class-reminder.gateway';
import { LiveClassReminderRepository } from './live-class-reminder.repository';
import { SendLiveClassRemindersUseCase } from './use-cases/send-live-class-reminders.use-case';
import { LiveClassRemindersCron } from './live-class-reminders.cron';

/** Email reminders before live classes; spans courses, enrollments and users. */
@Module({
  imports: [TypeOrmModule.forFeature([LiveClassReminder]), NotificationsModule],
  providers: [
    {
      provide: LiveClassReminderGateway,
      useClass: LiveClassReminderRepository,
    },
    SendLiveClassRemindersUseCase,
    LiveClassRemindersCron,
  ],
})
export class LiveClassRemindersModule {}
