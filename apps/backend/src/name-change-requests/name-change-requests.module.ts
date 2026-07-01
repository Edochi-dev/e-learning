import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NameChangeRequest } from './entities/name-change-request.entity';
import { NameChangeRequestGateway } from './gateways/name-change-request.gateway';
import { NameChangeRequestsRepository } from './name-change-requests.repository';
import { NameChangeRequestsController } from './name-change-requests.controller';
import { RequestNameChangeUseCase } from './use-cases/request-name-change.use-case';
import { ReviewNameChangeUseCase } from './use-cases/review-name-change.use-case';
import { ListPendingNameChangeRequestsUseCase } from './use-cases/list-pending-name-change-requests.use-case';
import { GetMyNameChangeRequestUseCase } from './use-cases/get-my-name-change-request.use-case';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * NameChangeRequestsModule — Flujo de cambio de nombre por solicitud.
 *
 * Importa:
 *   - UsersModule: UserGateway (leer nombre/email + aplicar el cambio al User).
 *   - NotificationsModule: NotificationGateway (avisar a admins y al alumno).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([NameChangeRequest]),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [NameChangeRequestsController],
  providers: [
    {
      provide: NameChangeRequestGateway,
      useClass: NameChangeRequestsRepository,
    },
    RequestNameChangeUseCase,
    ReviewNameChangeUseCase,
    ListPendingNameChangeRequestsUseCase,
    GetMyNameChangeRequestUseCase,
  ],
})
export class NameChangeRequestsModule {}
