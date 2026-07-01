import { Injectable } from '@nestjs/common';
import { NameChangeRequestGateway } from '../gateways/name-change-request.gateway';
import { NameChangeRequest } from '../entities/name-change-request.entity';

/**
 * ListPendingNameChangeRequestsUseCase — Cola de solicitudes pendientes (admin).
 */
@Injectable()
export class ListPendingNameChangeRequestsUseCase {
  constructor(private readonly requestGateway: NameChangeRequestGateway) {}

  execute(): Promise<NameChangeRequest[]> {
    return this.requestGateway.findPending();
  }
}
