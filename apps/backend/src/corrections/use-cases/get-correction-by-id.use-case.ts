import { Injectable, NotFoundException } from '@nestjs/common';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';

/**
 * GetCorrectionByIdUseCase — Obtiene una submission por su ID.
 *
 * Caso de uso admin: la profesora abre la página de revisión de una
 * entrega concreta. Necesita la submission con TODAS las relaciones:
 *   - student (nombre, email)
 *   - lesson (título, assignmentData con referenceImageUrl + instructions)
 *   - lesson.course (título del curso)
 *
 * Lanza NotFoundException si no existe — el frontend muestra un 404.
 */
@Injectable()
export class GetCorrectionByIdUseCase {
  constructor(private readonly correctionGateway: CorrectionGateway) {}

  async execute(submissionId: string): Promise<AssignmentSubmission> {
    const submission = await this.correctionGateway.findById(submissionId);
    if (!submission) {
      throw new NotFoundException('Entrega no encontrada');
    }
    return submission;
  }
}
