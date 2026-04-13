import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { LessonProgressGateway } from '../../progress/gateways/lesson-progress.gateway';
import { OrphanFileCleaner } from '../../storage/services/orphan-file-cleaner.service';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';

/**
 * ReviewCorrectionUseCase — La profesora aprueba o rechaza una entrega.
 *
 * Este es el USE CASE más importante del módulo corrections porque
 * ORQUESTA múltiples gateways para ejecutar una operación de negocio
 * compleja. Veamos qué hace cada paso:
 *
 * APROBAR:
 *   1. Actualizar submission → status='approved', guardar feedback
 *   2. Marcar lección completa → LessonProgressGateway (módulo progress)
 *   3. Borrar foto → OrphanFileCleaner (módulo storage)
 *   4. Notificar alumna → NotificationGateway (módulo notifications)
 *
 * RECHAZAR:
 *   1. Actualizar submission → status='rejected', guardar feedback
 *   2. NO borrar foto (la alumna necesita verla para saber qué corregir)
 *   3. Notificar alumna → NotificationGateway
 *
 * ¿Por qué NO borrar la foto al rechazar?
 *   Porque la alumna necesita ver su trabajo junto con el feedback
 *   para entender qué hizo mal. La foto se borrará cuando re-envíe
 *   (SubmitCorrectionUseCase limpia la foto vieja al recibir la nueva).
 *
 * ¿Por qué SÍ borrar al aprobar?
 *   Porque una vez aprobada, la foto ya cumplió su propósito. Mantenerla
 *   consumiría disco innecesariamente. El feedback en texto queda como
 *   audit trail permanente.
 *
 * Fíjate que este use case NO sabe:
 *   - Cómo se guarda la submission (eso es del repository/TypeORM)
 *   - Cómo se marca una lección completa (eso es de ProgressModule)
 *   - Cómo se borra un archivo (eso es de StorageModule)
 *   - Cómo se envía un email (eso es de NotificationsModule)
 *
 * Solo conoce los CONTRATOS (gateways abstractos). Eso es Clean Architecture.
 */
@Injectable()
export class ReviewCorrectionUseCase {
  constructor(
    private readonly correctionGateway: CorrectionGateway,
    private readonly lessonProgressGateway: LessonProgressGateway,
    private readonly orphanFileCleaner: OrphanFileCleaner,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async execute(
    submissionId: string,
    action: 'approve' | 'reject',
    feedback: string,
  ): Promise<AssignmentSubmission> {
    // 1. Buscar la submission con relaciones (necesitamos student.email y lesson.title)
    const submission = await this.correctionGateway.findById(submissionId);
    if (!submission) {
      throw new NotFoundException('Entrega no encontrada');
    }

    // 2. Solo se puede revisar una submission que esté pendiente.
    //    Si ya fue aprobada o rechazada, la profesora no debería poder
    //    cambiar su decisión desde este endpoint — eso sería otro use case
    //    (EditReview) con sus propias reglas de negocio.
    if (submission.status !== 'pending') {
      throw new BadRequestException(
        `Esta entrega ya fue revisada (status: ${submission.status})`,
      );
    }

    // 3. Determinar el nuevo status basado en la acción
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // 4. Actualizar la submission
    const updated = await this.correctionGateway.update(submissionId, {
      status: newStatus,
      feedback,
      reviewedAt: new Date(),
    });

    // 5. Si aprueba → marcar la lección como completa
    if (action === 'approve') {
      await this.lessonProgressGateway.markLessonComplete(
        submission.studentId,
        submission.lessonId,
      );
    }

    // 6. Si aprueba → borrar la foto (ya no se necesita)
    if (action === 'approve') {
      await this.orphanFileCleaner.deleteIfOrphan(
        submission.photoUrl,
        () => Promise.resolve(false), // La foto de una corrección aprobada nunca está referenciada
      );
    }

    // 7. Notificar a la alumna
    const studentEmail = submission.student?.email ?? 'student';
    const lessonTitle = submission.lesson?.title ?? 'la lección';
    const isApproved = action === 'approve';

    await this.notificationGateway.sendEmail({
      to: studentEmail,
      subject: isApproved
        ? `¡Tu trabajo fue aprobado! — ${lessonTitle}`
        : `Tu trabajo necesita correcciones — ${lessonTitle}`,
      body: isApproved
        ? `<p>¡Felicidades! Tu entrega para <strong>${lessonTitle}</strong> fue aprobada.</p>
           <p><strong>Feedback:</strong> ${feedback}</p>`
        : `<p>Tu entrega para <strong>${lessonTitle}</strong> necesita correcciones.</p>
           <p><strong>Feedback:</strong> ${feedback}</p>
           <p>Revisá el feedback y enviá tu trabajo de nuevo cuando estés lista.</p>`,
    });

    return updated;
  }
}
