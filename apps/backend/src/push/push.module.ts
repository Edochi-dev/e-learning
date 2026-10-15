import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushSubscription } from './entities/push-subscription.entity';
import { PushSubscriptionGateway } from './gateways/push-subscription.gateway';
import { PushRepository } from './push.repository';
import { PushService } from './push.service';
import { PushNotificationGateway } from './gateways/push-notification.gateway';
import { PushController } from './push.controller';

/**
 * PushModule — Notificaciones web-push. Exporta PushService (cron de la agenda)
 * y el contrato PushNotificationGateway para los casos de uso.
 */
@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription])],
  controllers: [PushController],
  providers: [
    { provide: PushSubscriptionGateway, useClass: PushRepository },
    PushService,
    { provide: PushNotificationGateway, useExisting: PushService },
  ],
  exports: [PushService, PushNotificationGateway],
})
export class PushModule {}
