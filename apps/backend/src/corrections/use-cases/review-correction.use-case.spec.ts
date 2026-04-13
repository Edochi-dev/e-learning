import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ReviewCorrectionUseCase } from './review-correction.use-case';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { LessonProgressGateway } from '../../progress/gateways/lesson-progress.gateway';
import { OrphanFileCleaner } from '../../storage/services/orphan-file-cleaner.service';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';

describe('ReviewCorrectionUseCase', () => {
  let useCase: ReviewCorrectionUseCase;
  let correctionGateway: jest.Mocked<CorrectionGateway>;
  let lessonProgressGateway: jest.Mocked<LessonProgressGateway>;
  let orphanFileCleaner: jest.Mocked<OrphanFileCleaner>;
  let notificationGateway: jest.Mocked<NotificationGateway>;

  const submissionId = 'sub-uuid';
  const feedback = 'Buen trabajo con el ápex';

  const pendingSubmission = {
    id: submissionId,
    studentId: 'student-uuid',
    lessonId: 'lesson-uuid',
    photoUrl: '/static/corrections/photo.jpg',
    status: 'pending',
    student: { email: 'maria@test.com', name: 'María' },
    lesson: { title: 'Práctica: Uña acrílica' },
  } as unknown as AssignmentSubmission;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ReviewCorrectionUseCase,
        {
          provide: CorrectionGateway,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: LessonProgressGateway,
          useValue: { markLessonComplete: jest.fn() },
        },
        {
          provide: OrphanFileCleaner,
          useValue: { deleteIfOrphan: jest.fn() },
        },
        {
          provide: NotificationGateway,
          useValue: { sendEmail: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(ReviewCorrectionUseCase);
    correctionGateway = module.get(CorrectionGateway);
    lessonProgressGateway = module.get(LessonProgressGateway);
    orphanFileCleaner = module.get(OrphanFileCleaner);
    notificationGateway = module.get(NotificationGateway);
  });

  // ── Validaciones ───────────────────────────────────────────────────

  it('lanza NotFoundException si la submission no existe', async () => {
    correctionGateway.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(submissionId, 'approve', feedback),
    ).rejects.toThrow(NotFoundException);
  });

  it('lanza BadRequestException si la submission ya fue aprobada', async () => {
    correctionGateway.findById.mockResolvedValue({
      ...pendingSubmission,
      status: 'approved',
    } as unknown as AssignmentSubmission);

    await expect(
      useCase.execute(submissionId, 'approve', feedback),
    ).rejects.toThrow(BadRequestException);
  });

  it('lanza BadRequestException si la submission ya fue rechazada', async () => {
    correctionGateway.findById.mockResolvedValue({
      ...pendingSubmission,
      status: 'rejected',
    } as unknown as AssignmentSubmission);

    await expect(
      useCase.execute(submissionId, 'reject', feedback),
    ).rejects.toThrow(BadRequestException);
  });

  // ── Flujo de aprobación ────────────────────────────────────────────

  describe('al aprobar', () => {
    beforeEach(() => {
      correctionGateway.findById.mockResolvedValue(pendingSubmission);
      correctionGateway.update.mockResolvedValue({
        ...pendingSubmission,
        status: 'approved',
        feedback,
      } as unknown as AssignmentSubmission);
    });

    it('actualiza la submission con status approved y feedback', async () => {
      await useCase.execute(submissionId, 'approve', feedback);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(correctionGateway.update).toHaveBeenCalledWith(submissionId, {
        status: 'approved',
        feedback,
        reviewedAt: expect.any(Date),
      });
    });

    it('marca la lección como completa vía LessonProgressGateway', async () => {
      await useCase.execute(submissionId, 'approve', feedback);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(lessonProgressGateway.markLessonComplete).toHaveBeenCalledWith(
        'student-uuid',
        'lesson-uuid',
      );
    });

    it('borra la foto vía OrphanFileCleaner', async () => {
      await useCase.execute(submissionId, 'approve', feedback);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(orphanFileCleaner.deleteIfOrphan).toHaveBeenCalledWith(
        '/static/corrections/photo.jpg',
        expect.any(Function),
      );
    });

    it('envía email de aprobación a la alumna', async () => {
      await useCase.execute(submissionId, 'approve', feedback);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(notificationGateway.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'maria@test.com',
          subject: expect.stringContaining('aprobado'),
        }),
      );
    });

    it('retorna la submission actualizada', async () => {
      const result = await useCase.execute(submissionId, 'approve', feedback);

      expect(result.status).toBe('approved');
      expect(result.feedback).toBe(feedback);
    });
  });

  // ── Flujo de rechazo ──────────────────────────────────────────────

  describe('al rechazar', () => {
    beforeEach(() => {
      correctionGateway.findById.mockResolvedValue(pendingSubmission);
      correctionGateway.update.mockResolvedValue({
        ...pendingSubmission,
        status: 'rejected',
        feedback,
      } as unknown as AssignmentSubmission);
    });

    it('actualiza la submission con status rejected y feedback', async () => {
      await useCase.execute(submissionId, 'reject', feedback);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(correctionGateway.update).toHaveBeenCalledWith(submissionId, {
        status: 'rejected',
        feedback,
        reviewedAt: expect.any(Date),
      });
    });

    it('NO marca la lección como completa', async () => {
      await useCase.execute(submissionId, 'reject', feedback);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(lessonProgressGateway.markLessonComplete).not.toHaveBeenCalled();
    });

    it('NO borra la foto (la alumna la necesita para corregir)', async () => {
      await useCase.execute(submissionId, 'reject', feedback);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(orphanFileCleaner.deleteIfOrphan).not.toHaveBeenCalled();
    });

    it('envía email de rechazo a la alumna', async () => {
      await useCase.execute(submissionId, 'reject', feedback);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(notificationGateway.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'maria@test.com',
          subject: expect.stringContaining('correcciones'),
        }),
      );
    });
  });
});
