import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { CorrectionGateway } from './gateways/correction.gateway';
import { CorrectionsRepository } from './corrections.repository';
import { CorrectionsController } from './corrections.controller';
import { SubmitCorrectionUseCase } from './use-cases/submit-correction.use-case';
import { GetMyCorrectionStatusUseCase } from './use-cases/get-my-correction-status.use-case';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { ProgressModule } from '../progress/progress.module';

/**
 * CorrectionsModule — Módulo de correcciones (entregas de tareas).
 *
 * Importa:
 *   - CoursesModule: LessonGateway (verificar que la lección existe y es tipo correction).
 *   - EnrollmentsModule: EnrollmentGateway (ownership check — ¿está matriculada?).
 *   - NotificationsModule: NotificationGateway (avisar a la profesora).
 *   - StorageModule: FileStorageGateway + OrphanFileCleaner + ImageProcessorService.
 *   - ProgressModule: LessonProgressGateway (para marcar lección completa al aprobar).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AssignmentSubmission]),
    CoursesModule,
    EnrollmentsModule,
    NotificationsModule,
    StorageModule,
    ProgressModule,
  ],
  controllers: [CorrectionsController],
  providers: [
    { provide: CorrectionGateway, useClass: CorrectionsRepository },
    SubmitCorrectionUseCase,
    GetMyCorrectionStatusUseCase,
  ],
  exports: [CorrectionGateway],
})
export class CorrectionsModule {}
