import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReviewCorrectionUseCase } from './review-correction.use-case';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { CorrectionReviewGateway } from '../gateways/correction-review.gateway';
import { SpeechTranscriber } from '../gateways/speech-transcriber.gateway';
import { ReviewAudioRecorder } from '../services/review-audio-recorder.service';
import { LessonProgressGateway } from '../../progress/gateways/lesson-progress.gateway';
import { EnrollmentGateway } from '../../enrollments/gateways/enrollment.gateway';
import { OrphanFileCleaner } from '../../storage/services/orphan-file-cleaner.service';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';
import { CorrectionReview } from '../entities/correction-review.entity';
import { TranscriptStatus } from '../domain/transcript-status';

describe('ReviewCorrectionUseCase', () => {
  const recording = Buffer.from('voice');
  const submissionId = 'sub-uuid';

  const pendingSubmission = {
    id: submissionId,
    studentId: 'student-uuid',
    lessonId: 'lesson-uuid',
    photoUrl: '/static/corrections/photo.jpg',
    status: 'pending',
    student: { email: 'maria@test.com' },
    lesson: { title: 'Práctica: Uña acrílica', courseId: 'course-uuid' },
  } as unknown as AssignmentSubmission;

  let findById: jest.Mock;
  let record: jest.Mock;
  let storeAudio: jest.Mock;
  let discard: jest.Mock;
  let findByUserAndCourse: jest.Mock;
  let markLessonComplete: jest.Mock;
  let deleteIfOrphan: jest.Mock;
  let sendEmail: jest.Mock;
  let transcriber: { enabled: boolean };
  let useCase: ReviewCorrectionUseCase;

  beforeEach(() => {
    findById = jest.fn().mockResolvedValue(pendingSubmission);
    record = jest.fn((review: Partial<CorrectionReview>) =>
      Promise.resolve(review as CorrectionReview),
    );
    storeAudio = jest
      .fn()
      .mockResolvedValue({ audioFile: 'r.m4a', durationSeconds: 42 });
    discard = jest.fn().mockResolvedValue(undefined);
    findByUserAndCourse = jest.fn().mockResolvedValue({ expiresAt: null });
    markLessonComplete = jest.fn().mockResolvedValue(undefined);
    deleteIfOrphan = jest.fn().mockResolvedValue(undefined);
    sendEmail = jest.fn().mockResolvedValue(undefined);
    transcriber = { enabled: true };

    useCase = new ReviewCorrectionUseCase(
      { findById } as unknown as CorrectionGateway,
      { record } as unknown as CorrectionReviewGateway,
      { store: storeAudio, discard } as unknown as ReviewAudioRecorder,
      transcriber as SpeechTranscriber,
      { findByUserAndCourse } as unknown as EnrollmentGateway,
      { markLessonComplete } as unknown as LessonProgressGateway,
      { deleteIfOrphan } as unknown as OrphanFileCleaner,
      { sendEmail } as unknown as NotificationGateway,
    );
  });

  it('lanza NotFoundException si la entrega no existe', async () => {
    findById.mockResolvedValue(null);
    await expect(
      useCase.execute(submissionId, 'approve', recording),
    ).rejects.toThrow(NotFoundException);
    expect(storeAudio).not.toHaveBeenCalled();
  });

  it('no revisa dos veces la misma entrega', async () => {
    findById.mockResolvedValue({ ...pendingSubmission, status: 'approved' });
    await expect(
      useCase.execute(submissionId, 'reject', recording),
    ).rejects.toThrow(BadRequestException);
    expect(storeAudio).not.toHaveBeenCalled();
  });

  it('guarda el audio con el id de la revisión y la registra', async () => {
    const review = await useCase.execute(submissionId, 'approve', recording);

    const [reviewId, data] = storeAudio.mock.calls[0] as [string, Buffer];
    expect(data).toBe(recording);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        id: reviewId,
        submissionId,
        decision: 'approved',
        audioFile: 'r.m4a',
        audioDurationSeconds: 42,
        transcriptStatus: TranscriptStatus.PENDING,
      }),
    );
    expect(review.decision).toBe('approved');
  });

  it('el audio vence con la matrícula cuando el curso tiene fin', async () => {
    const expiresAt = new Date('2027-01-31T00:00:00Z');
    findByUserAndCourse.mockResolvedValue({ expiresAt });

    await useCase.execute(submissionId, 'reject', recording);

    expect(findByUserAndCourse).toHaveBeenCalledWith(
      'student-uuid',
      'course-uuid',
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ audioExpiresAt: expiresAt }),
    );
  });

  it('marca la transcripción como no disponible si está desactivada', async () => {
    transcriber.enabled = false;
    await useCase.execute(submissionId, 'reject', recording);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        transcriptStatus: TranscriptStatus.UNAVAILABLE,
      }),
    );
  });

  it('borra el audio si no se pudo registrar la revisión', async () => {
    record.mockRejectedValue(new Error('db down'));
    await expect(
      useCase.execute(submissionId, 'approve', recording),
    ).rejects.toThrow('db down');
    expect(discard).toHaveBeenCalledWith('r.m4a');
    expect(markLessonComplete).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('al aprobar completa la lección y borra la foto', async () => {
    await useCase.execute(submissionId, 'approve', recording);
    expect(markLessonComplete).toHaveBeenCalledWith(
      'student-uuid',
      'lesson-uuid',
    );
    expect(deleteIfOrphan).toHaveBeenCalledWith(
      '/static/corrections/photo.jpg',
      expect.any(Function),
    );
  });

  it('al reprobar conserva la foto y no completa la lección', async () => {
    await useCase.execute(submissionId, 'reject', recording);
    expect(markLessonComplete).not.toHaveBeenCalled();
    expect(deleteIfOrphan).not.toHaveBeenCalled();
  });

  it('avisa a la alumna con un enlace a su curso', async () => {
    await useCase.execute(submissionId, 'reject', recording);
    const [email] = sendEmail.mock.calls[0] as [
      { to: string; content: { action: { path: string } } },
    ];
    expect(email.to).toBe('maria@test.com');
    expect(email.content.action.path).toBe('/courses/course-uuid/learn');
  });

  it('no envía correo si la alumna no tiene dirección', async () => {
    findById.mockResolvedValue({ ...pendingSubmission, student: undefined });
    await useCase.execute(submissionId, 'approve', recording);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
