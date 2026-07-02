import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushSubscription } from './entities/push-subscription.entity';
import { PushSubscriptionGateway } from './gateways/push-subscription.gateway';
import { PushRepository } from './push.repository';
import { PushService } from './push.service';
import { PushController } from './push.controller';

/**
 * PushModule — Notificaciones web-push. Exporta PushService para que el cron
 * de recordatorios de la agenda difunda los avisos.
 */
@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription])],
  controllers: [PushController],
  providers: [
    { provide: PushSubscriptionGateway, useClass: PushRepository },
    PushService,
  ],
  exports: [PushService],
})
export class PushModule {}
