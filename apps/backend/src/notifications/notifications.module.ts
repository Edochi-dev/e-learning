import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailOutboxMessage } from './entities/email-outbox-message.entity';
import { NotificationGateway } from './gateways/notification.gateway';
import { EmailOutboxWriter } from './gateways/email-outbox-writer.gateway';
import { EmailOutboxQueue } from './gateways/email-outbox-queue.gateway';
import { EmailTransport } from './gateways/email-transport.gateway';
import { OutboxNotificationGateway } from './adapters/outbox-notification.gateway';
import { EmailOutboxRepository } from './email-outbox.repository';
import { EmailRetryPolicy } from './domain/email-retry-policy';
import { buildEmailTransport } from './email-transport.factory';
import { DeliverDueEmailsUseCase } from './use-cases/deliver-due-emails.use-case';
import { EmailOutboxWorker } from './email-outbox.worker';

/**
 * Other modules only see NotificationGateway, which queues into the outbox.
 * The worker delivers from there through the transport chain built from env.
 */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([EmailOutboxMessage])],
  providers: [
    EmailOutboxRepository,
    { provide: EmailOutboxWriter, useExisting: EmailOutboxRepository },
    { provide: EmailOutboxQueue, useExisting: EmailOutboxRepository },
    { provide: NotificationGateway, useClass: OutboxNotificationGateway },
    {
      provide: EmailTransport,
      inject: [ConfigService],
      useFactory: buildEmailTransport,
    },
    { provide: EmailRetryPolicy, useValue: new EmailRetryPolicy() },
    DeliverDueEmailsUseCase,
    EmailOutboxWorker,
  ],
  exports: [NotificationGateway],
})
export class NotificationsModule {}
