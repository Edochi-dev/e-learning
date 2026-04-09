import { Injectable } from '@nestjs/common';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';

/**
 * GetMyCorrectionStatusUseCase — La alumna consulta el estado de su entrega.
 *
 * Retorna la submission si existe, o null si nunca envió.
 * El frontend usa esto para renderizar el estado correcto:
 *   - null         → mostrar formulario de upload
 *   - pending      → "Esperando revisión de la profesora"
 *   - approved     → "¡Aprobada!" + feedback
 *   - rejected     → "Rechazada" + feedback + botón de re-enviar
 *
 * No necesita ownership check porque la query filtra por studentId
 * (el userId del JWT). Una alumna solo puede ver su propia submission.
 */
@Injectable()
export class GetMyCorrectionStatusUseCase {
  constructor(private readonly correctionGateway: CorrectionGateway) {}

  async execute(
    userId: string,
    lessonId: string,
  ): Promise<AssignmentSubmission | null> {
    return this.correctionGateway.findByStudentAndLesson(userId, lessonId);
  }
}
