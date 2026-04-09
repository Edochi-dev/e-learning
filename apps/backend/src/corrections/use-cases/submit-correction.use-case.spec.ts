import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SubmitCorrectionUseCase } from './submit-correction.use-case';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { EnrollmentGateway } from '../../enrollments/gateways/enrollment.gateway';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { OrphanFileCleaner } from '../../storage/services/orphan-file-cleaner.service';
import { ImageProcessorService } from '../../storage/services/image-processor.service';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { Lesson } from '../../courses/entities/lessons.entity';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';

describe('SubmitCorrectionUseCase', () => {
  let useCase: SubmitCorrectionUseCase;
  let correctionGateway: jest.Mocked<CorrectionGateway>;
  let enrollmentGateway: jest.Mocked<EnrollmentGateway>;
  let lessonGateway: jest.Mocked<LessonGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;
  let orphanFileCleaner: jest.Mocked<OrphanFileCleaner>;
  let imageProcessor: jest.Mocked<ImageProcessorService>;
  let notificationGateway: jest.Mocked<NotificationGateway>;

  const userId = 'student-uuid';
  const lessonId = 'lesson-uuid';
  const courseId = 'course-uuid';

  const mockFile = {
    buffer: Buffer.from('fake-image'),
    mimetype: 'image/jpeg',
    originalname: 'nail-art.jpg',
  } as Express.Multer.File;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        SubmitCorrectionUseCase,
        {
          provide: CorrectionGateway,
          useValue: {
            findByStudentAndLesson: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: EnrollmentGateway,
          useValue: { findByUserAndCourse: jest.fn() },
        },
        {
          provide: LessonGateway,
          useValue: { findLesson: jest.fn() },
        },
        {
          provide: FileStorageGateway,
          useValue: { saveFile: jest.fn() },
        },
        {
          provide: OrphanFileCleaner,
          useValue: { deleteIfOrphan: jest.fn() },
        },
        {
          provide: ImageProcessorService,
          useValue: {
            isHeic: jest.fn().mockReturnValue(false),
            convertToJpeg: jest.fn(),
          },
        },
        {
          provide: NotificationGateway,
          useValue: { sendEmail: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(SubmitCorrectionUseCase);
    correctionGateway = module.get(CorrectionGateway);
    enrollmentGateway = module.get(EnrollmentGateway);
    lessonGateway = module.get(LessonGateway);
    fileStorageGateway = module.get(FileStorageGateway);
    orphanFileCleaner = module.get(OrphanFileCleaner);
    imageProcessor = module.get(ImageProcessorService);
    notificationGateway = module.get(NotificationGateway);
  });

  it('lanza ForbiddenException si la alumna no está matriculada', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue(null);

    await expect(
      useCase.execute(userId, lessonId, courseId, mockFile),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lanza NotFoundException si la lección no existe', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({} as Enrollment);
    lessonGateway.findLesson.mockResolvedValue(null);

    await expect(
      useCase.execute(userId, lessonId, courseId, mockFile),
    ).rejects.toThrow(NotFoundException);
  });

  it('lanza BadRequestException si la lección no es tipo correction', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({} as Enrollment);
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      type: 'class',
    } as unknown as Lesson);

    await expect(
      useCase.execute(userId, lessonId, courseId, mockFile),
    ).rejects.toThrow(BadRequestException);
  });

  it('crea una submission nueva cuando no existe entrega previa', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({} as Enrollment);
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      type: 'correction',
      title: 'Nail Art Básico',
    } as unknown as Lesson);
    correctionGateway.findByStudentAndLesson.mockResolvedValue(null);
    fileStorageGateway.saveFile.mockResolvedValue(
      '/static/corrections/photo.jpg',
    );
    correctionGateway.create.mockResolvedValue({
      id: 'sub-uuid',
      status: 'pending',
    } as unknown as AssignmentSubmission);

    const result = await useCase.execute(userId, lessonId, courseId, mockFile);

    expect(result.status).toBe('pending');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(correctionGateway.create).toHaveBeenCalledWith({
      studentId: userId,
      lessonId,
      photoUrl: '/static/corrections/photo.jpg',
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(notificationGateway.sendEmail).toHaveBeenCalled();
  });

  it('actualiza la submission existente en un re-envío y borra la foto vieja', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({} as Enrollment);
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      type: 'correction',
      title: 'Nail Art Básico',
    } as unknown as Lesson);
    correctionGateway.findByStudentAndLesson.mockResolvedValue({
      id: 'existing-sub',
      photoUrl: '/static/corrections/old-photo.jpg',
    } as unknown as AssignmentSubmission);
    fileStorageGateway.saveFile.mockResolvedValue(
      '/static/corrections/new-photo.jpg',
    );
    correctionGateway.update.mockResolvedValue({
      id: 'existing-sub',
      status: 'pending',
    } as unknown as AssignmentSubmission);

    await useCase.execute(userId, lessonId, courseId, mockFile);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(correctionGateway.update).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(orphanFileCleaner.deleteIfOrphan).toHaveBeenCalledWith(
      '/static/corrections/old-photo.jpg',
      expect.any(Function),
    );
  });

  it('convierte HEIC a JPEG antes de guardar', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({} as Enrollment);
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      type: 'correction',
      title: 'Test',
    } as unknown as Lesson);
    correctionGateway.findByStudentAndLesson.mockResolvedValue(null);
    imageProcessor.isHeic.mockReturnValue(true);
    imageProcessor.convertToJpeg.mockResolvedValue(Buffer.from('jpeg-data'));
    fileStorageGateway.saveFile.mockResolvedValue(
      '/static/corrections/converted.jpg',
    );
    correctionGateway.create.mockResolvedValue({} as AssignmentSubmission);

    const heicFile = {
      ...mockFile,
      mimetype: 'image/heic',
      originalname: 'photo.heic',
    } as Express.Multer.File;

    await useCase.execute(userId, lessonId, courseId, heicFile);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(imageProcessor.convertToJpeg).toHaveBeenCalledWith(heicFile.buffer);
    const savedFile = fileStorageGateway.saveFile.mock.calls[0][0];
    expect(savedFile.mimetype).toBe('image/jpeg');
  });

  it('reintenta la conversión HEIC y tiene éxito en el segundo intento', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({} as Enrollment);
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      type: 'correction',
      title: 'Test',
    } as unknown as Lesson);
    correctionGateway.findByStudentAndLesson.mockResolvedValue(null);
    imageProcessor.isHeic.mockReturnValue(true);
    imageProcessor.convertToJpeg
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(Buffer.from('jpeg-ok'));
    fileStorageGateway.saveFile.mockResolvedValue(
      '/static/corrections/retry.jpg',
    );
    correctionGateway.create.mockResolvedValue({} as AssignmentSubmission);

    const heicFile = {
      ...mockFile,
      mimetype: 'image/heic',
    } as Express.Multer.File;

    await useCase.execute(userId, lessonId, courseId, heicFile);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(imageProcessor.convertToJpeg).toHaveBeenCalledTimes(2);
  });

  it('lanza BadRequestException con link a convertidor si los 3 intentos fallan', async () => {
    enrollmentGateway.findByUserAndCourse.mockResolvedValue({} as Enrollment);
    lessonGateway.findLesson.mockResolvedValue({
      id: lessonId,
      type: 'correction',
      title: 'Test',
    } as unknown as Lesson);
    imageProcessor.isHeic.mockReturnValue(true);
    imageProcessor.convertToJpeg.mockRejectedValue(new Error('corrupt'));

    const heicFile = {
      ...mockFile,
      mimetype: 'image/heic',
    } as Express.Multer.File;

    await expect(
      useCase.execute(userId, lessonId, courseId, heicFile),
    ).rejects.toThrow(BadRequestException);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(imageProcessor.convertToJpeg).toHaveBeenCalledTimes(3);
  });
});
