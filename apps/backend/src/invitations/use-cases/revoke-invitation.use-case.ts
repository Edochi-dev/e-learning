import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InvitationGateway } from '../gateways/invitation.gateway';

/**
 * RevokeInvitationUseCase — La profesora anula un enlace que ya repartió.
 *
 * Revocar una invitación ya canjeada no haría nada útil y sí daría a entender
 * que se retiró un acceso: quitarle el curso a alguien es otra operación
 * distinta, sobre la matrícula.
 */
@Injectable()
export class RevokeInvitationUseCase {
  constructor(private readonly invitationGateway: InvitationGateway) {}

  async execute(id: string): Promise<void> {
    const invitation = await this.invitationGateway.findById(id);
    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    if (invitation.redeemedAt) {
      throw new ConflictException(
        'Esta invitación ya fue canjeada: revocarla no retira el acceso concedido',
      );
    }

    await this.invitationGateway.revoke(id, new Date());
  }
}
