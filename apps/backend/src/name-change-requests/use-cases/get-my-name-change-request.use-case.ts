import { Injectable } from '@nestjs/common';
import { NameChangeRequestGateway } from '../gateways/name-change-request.gateway';
import { NameChangeRequest } from '../entities/name-change-request.entity';

/**
 * GetMyNameChangeRequestUseCase — La solicitud más reciente del alumno.
 *
 * El frontend la usa para mostrar el estado ("pendiente", "aprobada", etc.) y
 * calcular desde cuándo puede volver a solicitar. Devuelve null si nunca pidió.
 */
@Injectable()
export class GetMyNameChangeRequestUseCase {
  constructor(private readonly requestGateway: NameChangeRequestGateway) {}

  execute(userId: string): Promise<NameChangeRequest | null> {
    return this.requestGateway.findLatestByUser(userId);
  }
}
