import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { CorrectionGateway } from './gateways/correction.gateway';
import { PendingCorrectionsGateway } from './gateways/pending-corrections.gateway';
import { CorrectionsRepository } from './corrections.repository';
import { CorrectionsController } from './corrections.controller';
import { SubmitCorrectionUseCase } from './use-cases/submit-correction.use-case';
import { GetMyCorrectionStatusUseCase } from './use-cases/get-my-correction-status.use-case';
import { ListPendingCorrectionsUseCase } from './use-cases/list-pending-corrections.use-case';
import { ListAllCorrectionsUseCase } from './use-cases/list-all-corrections.use-case';
import { ReviewCorrectionUseCase } from './use-cases/review-correction.use-case';
import { GetCorrectionByIdUseCase } from './use-cases/get-correction-by-id.use-case';
import { RemindPendingCorrectionsUseCase } from './use-cases/remind-pending-corrections.use-case';
import { PendingCorrectionsReminderCron } from './pending-corrections-reminder.cron';
import { EnrollmentGuard } from '../common/guards/enrollment.guard';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { ProgressModule } from '../progress/progress.module';
import { UsersModule } from '../users/users.module';
import { PushModule } from '../push/push.module';

/**
 * CorrectionsModule — Módulo de correcciones (entregas de tareas).
 *
 * Importa:
 *   - CoursesModule: LessonGateway (verificar que la lección existe y es tipo correction).
 *   - EnrollmentsModule: EnrollmentGateway (para EnrollmentGuard — ownership check).
 *   - NotificationsModule: NotificationGateway (recordatorio por correo).
 *   - PushModule: PushNotificationGateway (aviso inmediato de cada entrega).
 *   - StorageModule: FileStorageGateway + OrphanFileCleaner + ImageProcessorService.
 *   - ProgressModule: LessonProgressGateway (para marcar lección completa al aprobar).
 *   - UsersModule: AlertRecipientsGateway (a quién mandar el recordatorio).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AssignmentSubmission]),
    CoursesModule,
    EnrollmentsModule,
    NotificationsModule,
    StorageModule,
    ProgressModule,
    UsersModule,
    PushModule,
  ],
  controllers: [CorrectionsController],
  providers: [
    CorrectionsRepository,
    { provide: CorrectionGateway, useExisting: CorrectionsRepository },
    { provide: PendingCorrectionsGateway, useExisting: CorrectionsRepository },
    EnrollmentGuard,
    SubmitCorrectionUseCase,
    GetMyCorrectionStatusUseCase,
    ListPendingCorrectionsUseCase,
    ListAllCorrectionsUseCase,
    ReviewCorrectionUseCase,
    GetCorrectionByIdUseCase,
    RemindPendingCorrectionsUseCase,
    PendingCorrectionsReminderCron,
  ],
  exports: [CorrectionGateway],
})
export class CorrectionsModule {}
