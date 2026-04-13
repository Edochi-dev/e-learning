import { Injectable } from '@nestjs/common';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';
import { PaginatedResult } from '../../common/types/paginated-result.type';

/**
 * Filtros opcionales para el histórico de correcciones.
 *
 * courseId: filtra por curso (via la relación lesson → course).
 * month/year: filtra por mes de revisión (reviewedAt).
 */
export interface CorrectionFilters {
  status?: string;
  lessonId?: string;
  studentId?: string;
  courseId?: string;
  month?: number;
  year?: number;
}

/**
 * ListAllCorrectionsUseCase — Histórico paginado de correcciones ya revisadas.
 *
 * Regla de negocio: el histórico NUNCA incluye pendientes. Solo muestra
 * entregas que ya fueron aprobadas o rechazadas. Por eso siempre pasamos
 * excludeStatus: 'pending' al gateway — defensa en profundidad.
 */
@Injectable()
export class ListAllCorrectionsUseCase {
  constructor(private readonly correctionGateway: CorrectionGateway) {}

  async execute(
    filters: CorrectionFilters,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AssignmentSubmission>> {
    return this.correctionGateway.findAll(
      { ...filters, excludeStatus: 'pending' },
      page,
      limit,
    );
  }
}
