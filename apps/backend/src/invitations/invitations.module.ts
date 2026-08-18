import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseInvitation } from './entities/course-invitation.entity';
import { InvitationGateway } from './gateways/invitation.gateway';
import { InvitationUnitOfWork } from './gateways/invitation-unit-of-work.gateway';
import { InvitationsRepository } from './repositories/invitations.repository';
import { TypeOrmInvitationUnitOfWork } from './adapters/typeorm-invitation-unit-of-work';
import { InvitationsController } from './invitations.controller';
import { CreateInvitationsUseCase } from './use-cases/create-invitations.use-case';
import { GetInvitationPreviewUseCase } from './use-cases/get-invitation-preview.use-case';
import { RedeemInvitationUseCase } from './use-cases/redeem-invitation.use-case';
import { ClaimInvitationUseCase } from './use-cases/claim-invitation.use-case';
import { RevokeInvitationUseCase } from './use-cases/revoke-invitation.use-case';
import { ListCourseInvitationsUseCase } from './use-cases/list-course-invitations.use-case';
import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';

/**
 * InvitationsModule — Enlaces de un solo uso para dar acceso a un curso.
 *
 * NO importa EnrollmentsModule: las matrículas del canje se crean dentro de la
 * transacción del Unit of Work, que construye sus propios repositorios sobre el
 * EntityManager transaccional. Inyectar aquí el gateway de matrículas invitaría
 * a usarlo fuera de la transacción, que es justo el error que este módulo
 * existe para hacer imposible.
 *
 * De UsersModule solo necesita TokenGateway, para firmar el JWT del auto-login.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CourseInvitation]),
    CoursesModule,
    UsersModule,
  ],
  controllers: [InvitationsController],
  providers: [
    { provide: InvitationGateway, useClass: InvitationsRepository },
    { provide: InvitationUnitOfWork, useClass: TypeOrmInvitationUnitOfWork },
    CreateInvitationsUseCase,
    GetInvitationPreviewUseCase,
    RedeemInvitationUseCase,
    ClaimInvitationUseCase,
    RevokeInvitationUseCase,
    ListCourseInvitationsUseCase,
  ],
})
export class InvitationsModule {}
