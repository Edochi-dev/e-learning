import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { NameChangeRequestGateway } from '../gateways/name-change-request.gateway';
import { UserGateway } from '../../users/gateways/user.gateway';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';
import { NameChangeRequest } from '../entities/name-change-request.entity';

/**
 * ReviewNameChangeUseCase — El admin aprueba o rechaza una solicitud.
 *
 * Calcado del molde de ReviewCorrectionUseCase:
 *   1. Buscar la solicitud (con la relación user para el email).
 *   2. Solo se puede revisar si está 'pending'.
 *   3. Si aprueba → aplicar el nuevo fullName al User (las iniciales del avatar
 *      se derivan del nombre, así que se regeneran solas).
 *   4. Actualizar status + feedback + reviewedAt.
 *   5. Notificar al alumno el resultado.
 *
 * El use case no sabe cómo se persiste ni cómo se envía el email: solo conoce
 * los contratos (gateways). Eso es Clean Architecture.
 */
@Injectable()
export class ReviewNameChangeUseCase {
  constructor(
    private readonly requestGateway: NameChangeRequestGateway,
    private readonly userGateway: UserGateway,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async execute(
    requestId: string,
    action: 'approve' | 'reject',
    feedback?: string,
  ): Promise<NameChangeRequest> {
    const req = await this.requestGateway.findById(requestId);
    if (!req) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (req.status !== 'pending') {
      throw new BadRequestException(
        `Esta solicitud ya fue revisada (status: ${req.status}).`,
      );
    }

    const isApproved = action === 'approve';

    // Aplicar el nuevo nombre SOLO si se aprueba.
    if (isApproved) {
      await this.userGateway.updateProfile(req.userId, req.requestedName);
    }

    const updated = await this.requestGateway.update(requestId, {
      status: isApproved ? 'approved' : 'rejected',
      feedback: feedback ?? null,
      reviewedAt: new Date(),
    });

    // Notificar al alumno el resultado.
    const email = req.user?.email;
    if (email) {
      await this.notificationGateway.sendEmail({
        to: email,
        subject: isApproved
          ? 'Tu cambio de nombre fue aprobado'
          : 'Tu solicitud de cambio de nombre fue rechazada',
        body: isApproved
          ? `<p>Tu nombre fue actualizado a <strong>${req.requestedName}</strong>.</p>
             ${feedback ? `<p><strong>Nota:</strong> ${feedback}</p>` : ''}`
          : `<p>Tu solicitud para cambiar tu nombre a <strong>${req.requestedName}</strong> fue rechazada.</p>
             ${feedback ? `<p><strong>Motivo:</strong> ${feedback}</p>` : ''}
             <p>Si crees que es un error, podés volver a solicitarlo.</p>`,
      });
    }

    return updated;
  }
}
