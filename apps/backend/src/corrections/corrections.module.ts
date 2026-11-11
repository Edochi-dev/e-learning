import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { CorrectionReview } from './entities/correction-review.entity';
import { CorrectionReviewGateway } from './gateways/correction-review.gateway';
import { ReviewTranscriptionQueue } from './gateways/review-transcription-queue.gateway';
import { ExpiredReviewAudioGateway } from './gateways/expired-review-audio.gateway';
import { CorrectionAudioStore } from './gateways/correction-audio-store.gateway';
import { AudioNormalizer } from './gateways/audio-normalizer.gateway';
import { SpeechTranscriber } from './gateways/speech-transcriber.gateway';
import { CorrectionReviewsRepository } from './correction-reviews.repository';
import { CorrectionAudioConfig } from './correction-audio.config';
import { LocalCorrectionAudioStore } from './adapters/local-correction-audio-store.adapter';
import { FfmpegAudioNormalizer } from './adapters/ffmpeg-audio-normalizer.adapter';
import {
  DisabledSpeechTranscriber,
  FasterWhisperTranscriber,
} from './adapters/faster-whisper-transcriber.adapter';
import { ReviewAudioRecorder } from './services/review-audio-recorder.service';
import { GetReviewAudioUseCase } from './use-cases/get-review-audio.use-case';
import { TranscribeNextReviewUseCase } from './use-cases/transcribe-next-review.use-case';
import { PurgeExpiredReviewAudioUseCase } from './use-cases/purge-expired-review-audio.use-case';
import { ReviewTranscriptionWorker } from './review-transcription.worker';
import { ReviewAudioRetentionCron } from './review-audio-retention.cron';
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
import { SubmissionStatusGateway } from './gateways/submission-status.gateway';
import { SubmissionStatusRepository } from './submission-status.repository';

/**
 * CorrectionsModule — Módulo de correcciones (entregas de tareas).
 *
 * Importa:
 *   - CoursesModule: LessonGateway (verificar que la lección existe y es tipo correction).
 *   - EnrollmentsModule: EnrollmentGateway (EnrollmentGuard y vencimiento de los audios).
 *   - NotificationsModule: NotificationGateway (recordatorio por correo).
 *   - PushModule: PushNotificationGateway (aviso inmediato de cada entrega).
 *   - StorageModule: FileStorageGateway + OrphanFileCleaner + ImageProcessorService.
 *   - ProgressModule: LessonProgressGateway (para marcar lección completa al aprobar).
 *   - UsersModule: AlertRecipientsGateway (a quién mandar el recordatorio).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AssignmentSubmission, CorrectionReview]),
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
    { provide: SubmissionStatusGateway, useClass: SubmissionStatusRepository },
    { provide: PendingCorrectionsGateway, useExisting: CorrectionsRepository },
    CorrectionReviewsRepository,
    {
      provide: CorrectionReviewGateway,
      useExisting: CorrectionReviewsRepository,
    },
    {
      provide: ReviewTranscriptionQueue,
      useExisting: CorrectionReviewsRepository,
    },
    {
      provide: ExpiredReviewAudioGateway,
      useExisting: CorrectionReviewsRepository,
    },
    CorrectionAudioConfig,
    { provide: CorrectionAudioStore, useClass: LocalCorrectionAudioStore },
    { provide: AudioNormalizer, useClass: FfmpegAudioNormalizer },
    {
      provide: SpeechTranscriber,
      inject: [CorrectionAudioConfig],
      useFactory: (config: CorrectionAudioConfig): SpeechTranscriber =>
        config.transcriptionEnabled
          ? new FasterWhisperTranscriber(config)
          : new DisabledSpeechTranscriber(),
    },
    ReviewAudioRecorder,
    EnrollmentGuard,
    SubmitCorrectionUseCase,
    GetMyCorrectionStatusUseCase,
    ListPendingCorrectionsUseCase,
    ListAllCorrectionsUseCase,
    ReviewCorrectionUseCase,
    GetCorrectionByIdUseCase,
    RemindPendingCorrectionsUseCase,
    PendingCorrectionsReminderCron,
    GetReviewAudioUseCase,
    TranscribeNextReviewUseCase,
    PurgeExpiredReviewAudioUseCase,
    ReviewTranscriptionWorker,
    ReviewAudioRetentionCron,
  ],
  exports: [CorrectionGateway, SubmissionStatusGateway],
})
export class CorrectionsModule {}
