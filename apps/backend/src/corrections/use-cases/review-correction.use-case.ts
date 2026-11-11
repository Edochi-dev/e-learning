import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { CorrectionReviewGateway } from '../gateways/correction-review.gateway';
import { SpeechTranscriber } from '../gateways/speech-transcriber.gateway';
import { ReviewAudioRecorder } from '../services/review-audio-recorder.service';
import { LessonProgressGateway } from '../../progress/gateways/lesson-progress.gateway';
import { EnrollmentGateway } from '../../enrollments/gateways/enrollment.gateway';
import { OrphanFileCleaner } from '../../storage/services/orphan-file-cleaner.service';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';
import { html } from '../../notifications/templates/safe-html';
import { audioExpiry } from '../domain/review-audio-policy';
import { TranscriptStatus } from '../domain/transcript-status';
import {
  CorrectionReview,
  ReviewDecision,
} from '../entities/correction-review.entity';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';

/**
 * The teacher approves or rejects a submission with a voice note.
 *
 * The audio is stored before the review is recorded and discarded if that
 * fails, so a review never points at a missing file. Transcription runs later,
 * in ReviewTranscriptionWorker.
 *
 * Approving marks the lesson complete and deletes the photo; rejecting keeps
 * the photo so the student can see what to fix.
 */
@Injectable()
export class ReviewCorrectionUseCase {
  constructor(
    private readonly correctionGateway: CorrectionGateway,
    private readonly reviews: CorrectionReviewGateway,
    private readonly audioRecorder: ReviewAudioRecorder,
    private readonly transcriber: SpeechTranscriber,
    private readonly enrollments: EnrollmentGateway,
    private readonly lessonProgressGateway: LessonProgressGateway,
    private readonly orphanFileCleaner: OrphanFileCleaner,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async execute(
    submissionId: string,
    action: 'approve' | 'reject',
    recording: Buffer,
  ): Promise<CorrectionReview> {
    const submission = await this.correctionGateway.findById(submissionId);
    if (!submission) {
      throw new NotFoundException('Entrega no encontrada');
    }
    // Changing a decision already made would be its own use case.
    if (submission.status !== 'pending') {
      throw new BadRequestException(
        `Esta entrega ya fue revisada (status: ${submission.status})`,
      );
    }

    const decision: ReviewDecision =
      action === 'approve' ? 'approved' : 'rejected';
    const reviewId = randomUUID();
    const reviewedAt = new Date();
    const audio = await this.audioRecorder.store(reviewId, recording);

    let review: CorrectionReview;
    try {
      review = await this.reviews.record({
        id: reviewId,
        submissionId,
        decision,
        audioFile: audio.audioFile,
        audioDurationSeconds: audio.durationSeconds,
        audioExpiresAt: await this.audioExpiresAt(submission, reviewedAt),
        transcriptStatus: this.transcriber.enabled
          ? TranscriptStatus.PENDING
          : TranscriptStatus.UNAVAILABLE,
        reviewedAt,
      });
    } catch (error) {
      await this.audioRecorder.discard(audio.audioFile);
      throw error;
    }

    if (decision === 'approved') {
      await this.lessonProgressGateway.markLessonComplete(
        submission.studentId,
        submission.lessonId,
      );
      await this.orphanFileCleaner.deleteIfOrphan(
        submission.photoUrl,
        () => Promise.resolve(false), // an approved submission's photo is referenced nowhere else
      );
    }

    await this.notifyStudent(submission, decision);
    return review;
  }

  private async audioExpiresAt(
    submission: AssignmentSubmission,
    reviewedAt: Date,
  ): Promise<Date> {
    const enrollment = await this.enrollments.findByUserAndCourse(
      submission.studentId,
      submission.lesson.courseId,
    );
    return audioExpiry(reviewedAt, enrollment?.expiresAt ?? null);
  }

  private async notifyStudent(
    submission: AssignmentSubmission,
    decision: ReviewDecision,
  ): Promise<void> {
    const to = submission.student?.email;
    if (!to) return;
    const lessonTitle = submission.lesson?.title ?? 'la lección';
    const action = {
      label: 'Escuchar a mi profesora',
      path: `/courses/${submission.lesson.courseId}/learn`,
    };

    await this.notificationGateway.sendEmail({
      to,
      subject:
        decision === 'approved'
          ? `¡Tu trabajo fue aprobado! — ${lessonTitle}`
          : `Tu trabajo necesita algunos ajustes — ${lessonTitle}`,
      content:
        decision === 'approved'
          ? {
              heading: '¡Tu trabajo fue aprobado!',
              body: html`<p>
                ¡Felicidades! Tu profesora revisó tu entrega para
                <strong>${lessonTitle}</strong> y te dejó un audio con sus
                comentarios.
              </p>`,
              action,
            }
          : {
              heading: 'Tu trabajo necesita algunos ajustes',
              body: html`<p>
                  Tu profesora revisó tu entrega para
                  <strong>${lessonTitle}</strong> y te dejó un audio
                  explicándote qué mejorar.
                </p>
                <p>
                  Escúchalo y envía tu trabajo de nuevo cuando estés lista.
                </p>`,
              action,
            },
    });
  }
}
