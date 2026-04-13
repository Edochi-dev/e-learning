import { Injectable } from '@nestjs/common';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';

/**
 * Filtros opcionales para el histórico de correcciones.
 *
 * Son un tipo propio del use case, no del gateway — si mañana agregamos
 * un filtro "por rango de fechas", lo añadimos aquí y el use case
 * transforma los datos antes de delegarlos al gateway.
 */
export interface CorrectionFilters {
  status?: string;
  lessonId?: string;
  studentId?: string;
}

/**
 * ListAllCorrectionsUseCase — Histórico completo de correcciones con filtros.
 *
 * Caso de uso admin: la profesora abre la pestaña "Histórico" y puede
 * filtrar por status (approved/rejected/pending), por lección o por alumna.
 *
 * A diferencia de ListPendingCorrections (que solo muestra pending),
 * este devuelve TODOS los registros, permitiendo a la profesora
 * llevar control de lo que ya revisó.
 */
@Injectable()
export class ListAllCorrectionsUseCase {
  constructor(private readonly correctionGateway: CorrectionGateway) {}

  async execute(filters?: CorrectionFilters): Promise<AssignmentSubmission[]> {
    return this.correctionGateway.findAll(filters);
  }
}
