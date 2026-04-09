import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LessonType } from '@maris-nails/shared';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { EnrollmentGateway } from '../../enrollments/gateways/enrollment.gateway';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { OrphanFileCleaner } from '../../storage/services/orphan-file-cleaner.service';
import { ImageProcessorService } from '../../storage/services/image-processor.service';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';

/**
 * SubmitCorrectionUseCase — La alumna envía su foto para una lección de corrección.
 *
 * Flujo completo:
 *   1. Ownership check: ¿está matriculada en el curso?
 *   2. Lesson check: ¿la lección existe y es de tipo 'correction'?
 *   3. Image processing: ¿es HEIC? → convertir a JPEG
 *   4. Re-submit check: ¿ya tiene una entrega anterior? → borrar foto vieja
 *   5. Save: guardar foto nueva + crear/actualizar submission
 *   6. Notify: avisarle a la profesora que hay una nueva entrega
 *
 * Re-envíos:
 *   Si la alumna ya envió y la profesora rechazó, puede re-enviar.
 *   La foto vieja se borra (OrphanFileCleaner) y la fila se actualiza
 *   (no se crea una nueva — @Unique(studentId, lessonId)).
 */
@Injectable()
export class SubmitCorrectionUseCase {
  constructor(
    private readonly correctionGateway: CorrectionGateway,
    private readonly enrollmentGateway: EnrollmentGateway,
    private readonly lessonGateway: LessonGateway,
    private readonly fileStorageGateway: FileStorageGateway,
    private readonly orphanFileCleaner: OrphanFileCleaner,
    private readonly imageProcessor: ImageProcessorService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    courseId: string,
    file: Express.Multer.File,
  ): Promise<AssignmentSubmission> {
    // 1. ¿Está matriculada?
    const enrollment = await this.enrollmentGateway.findByUserAndCourse(
      userId,
      courseId,
    );
    if (!enrollment) {
      throw new ForbiddenException('No estás matriculada en este curso');
    }

    // 2. ¿La lección existe y es tipo corrección?
    const lesson = await this.lessonGateway.findLesson(lessonId);
    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }
    if (lesson.type !== LessonType.CORRECTION) {
      throw new BadRequestException('Esta lección no es de tipo corrección');
    }

    // 3. Procesar imagen: convertir HEIC→JPEG si es necesario.
    //    Retry 2 veces por si sharp falla transitoriamente (ej. pico de memoria).
    //    Si persiste, asumimos archivo problemático y damos mensaje amigable.
    let processedFile = file;
    if (this.imageProcessor.isHeic(file.mimetype)) {
      const maxAttempts = 3;
      let jpegBuffer: Buffer | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          jpegBuffer = await this.imageProcessor.convertToJpeg(file.buffer);
          break;
        } catch {
          if (attempt === maxAttempts) {
            throw new BadRequestException(
              'No pudimos procesar tu foto HEIC. ' +
                'Convertila a JPG en https://convertio.co/es/heic-jpg/ ' +
                'e intentá de nuevo.',
            );
          }
        }
      }

      processedFile = {
        ...file,
        buffer: jpegBuffer!,
        mimetype: 'image/jpeg',
        originalname: file.originalname.replace(/\.hei[cf]$/i, '.jpg'),
      };
    }

    // 4. ¿Ya tiene una entrega anterior? → preparar limpieza de foto vieja
    const existing = await this.correctionGateway.findByStudentAndLesson(
      userId,
      lessonId,
    );
    const oldPhotoUrl = existing?.photoUrl;

    // 5. Guardar nueva foto
    const photoUrl = await this.fileStorageGateway.saveFile(
      processedFile,
      'corrections',
    );

    // 6. Crear o actualizar la submission
    let submission: AssignmentSubmission;
    if (existing) {
      submission = await this.correctionGateway.update(existing.id, {
        photoUrl,
        status: 'pending',
        feedback: undefined,
        submittedAt: new Date(),
      });
    } else {
      submission = await this.correctionGateway.create({
        studentId: userId,
        lessonId,
        photoUrl,
      });
    }

    // 7. Borrar foto vieja (después de guardar la nueva — orden seguro)
    if (oldPhotoUrl) {
      await this.orphanFileCleaner.deleteIfOrphan(
        oldPhotoUrl,
        () => Promise.resolve(false), // La foto vieja nunca está referenciada por otros
      );
    }

    // 8. Notificar a la profesora
    await this.notificationGateway.sendEmail({
      to: 'admin', // Se resolverá a la dirección real en el adapter
      subject: 'Nueva entrega de corrección',
      body: `<p>Una alumna envió su trabajo para la lección <strong>${lesson.title}</strong>.</p>`,
    });

    return submission;
  }
}
