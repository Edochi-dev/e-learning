import { Injectable } from '@nestjs/common';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';

/**
 * ListPendingCorrectionsUseCase — Lista las entregas pendientes de revisión.
 *
 * Caso de uso admin: la profesora abre la pestaña "Pendientes" y ve todas
 * las submissions que aún no ha revisado (status = 'pending').
 *
 * Hoy es un simple pass-through al gateway, pero existe como use case
 * separado porque:
 *   1. El controller no debe conocer al gateway directamente (Clean Arch).
 *   2. Si mañana necesitamos filtrar por curso o paginar, el cambio
 *      se hace aquí — el controller y el gateway no se tocan.
 */
@Injectable()
export class ListPendingCorrectionsUseCase {
  constructor(private readonly correctionGateway: CorrectionGateway) {}

  async execute(): Promise<AssignmentSubmission[]> {
    return this.correctionGateway.findPending();
  }
}
