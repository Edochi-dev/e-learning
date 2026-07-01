import { NameChangeRequest } from '../entities/name-change-request.entity';

/**
 * Tipos planos para el gateway (mismo patrón que CorrectionGateway): el gateway
 * recibe datos planos, no entidades. El repositorio los convierte en entidades.
 */
export interface CreateNameChangeRequestData {
  userId: string;
  currentName: string;
  requestedName: string;
}

export interface UpdateNameChangeRequestData {
  status?: string;
  feedback?: string | null;
  reviewedAt?: Date;
}

/**
 * NameChangeRequestGateway — Contrato abstracto de persistencia de solicitudes.
 *
 * Clase abstracta (no interfaz) porque NestJS necesita un token en runtime para
 * la inyección de dependencias. Los use cases dependen solo de este contrato.
 */
export abstract class NameChangeRequestGateway {
  abstract create(
    data: CreateNameChangeRequestData,
  ): Promise<NameChangeRequest>;

  abstract findById(id: string): Promise<NameChangeRequest | null>;

  abstract update(
    id: string,
    data: UpdateNameChangeRequestData,
  ): Promise<NameChangeRequest>;

  /** Solicitudes pendientes de revisión (cola del admin). */
  abstract findPending(): Promise<NameChangeRequest[]>;

  /** La solicitud más reciente de un usuario (para estado + cooldown). */
  abstract findLatestByUser(userId: string): Promise<NameChangeRequest | null>;
}
