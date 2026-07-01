import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '@maris-nails/shared';
import { NameChangeRequestGateway } from '../gateways/name-change-request.gateway';
import { UserGateway } from '../../users/gateways/user.gateway';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';
import { NameChangeRequest } from '../entities/name-change-request.entity';

/**
 * RequestNameChangeUseCase — El alumno solicita cambiar su nombre.
 *
 * Regla anti-spam (decidida con el cliente): 1 solicitud pendiente a la vez
 * Y como máximo 1 solicitud cada 30 días. Así un alumno no puede inundar la
 * cola del admin ni cambiarse el nombre en bucle.
 *
 * Orquesta:
 *   - UserGateway            → leer nombre/email actuales.
 *   - NameChangeRequestGateway → validar historial + crear la solicitud.
 *   - NotificationGateway    → avisar (best-effort) a los admins.
 */
const COOLDOWN_DAYS = 30;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

@Injectable()
export class RequestNameChangeUseCase {
  constructor(
    private readonly requestGateway: NameChangeRequestGateway,
    private readonly userGateway: UserGateway,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async execute(
    userId: string,
    rawRequestedName: string,
  ): Promise<NameChangeRequest> {
    const user = await this.userGateway.findOne(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const requestedName = rawRequestedName.trim();
    if (requestedName === user.fullName) {
      throw new BadRequestException(
        'El nombre solicitado es igual a tu nombre actual.',
      );
    }

    // Anti-spam: 1 pendiente a la vez + 1 cada 30 días.
    const latest = await this.requestGateway.findLatestByUser(userId);
    if (latest && latest.status === 'pending') {
      throw new BadRequestException(
        'Ya tienes una solicitud de cambio de nombre pendiente de revisión.',
      );
    }
    if (latest) {
      const elapsed = Date.now() - new Date(latest.createdAt).getTime();
      if (elapsed < COOLDOWN_MS) {
        const availableAt = new Date(
          new Date(latest.createdAt).getTime() + COOLDOWN_MS,
        );
        throw new BadRequestException(
          `Solo puedes solicitar un cambio de nombre cada ${COOLDOWN_DAYS} días. ` +
            `Podrás volver a solicitarlo a partir del ${availableAt.toLocaleDateString('es-VE')}.`,
        );
      }
    }

    const created = await this.requestGateway.create({
      userId,
      currentName: user.fullName,
      requestedName,
    });

    // Aviso a los admins. Best-effort: si el email falla, la solicitud igual
    // se creó — no bloqueamos al alumno por un problema de notificación.
    await this.notifyAdmins(user.fullName, requestedName).catch(
      () => undefined,
    );

    return created;
  }

  private async notifyAdmins(
    currentName: string,
    requestedName: string,
  ): Promise<void> {
    const users = await this.userGateway.findAll();
    const admins = users.filter((u) => u.role === UserRole.ADMIN);
    await Promise.all(
      admins.map((admin) =>
        this.notificationGateway.sendEmail({
          to: admin.email,
          subject: 'Nueva solicitud de cambio de nombre',
          body: `<p>El alumno <strong>${currentName}</strong> solicitó cambiar su nombre a <strong>${requestedName}</strong>.</p>
                 <p>Revisá la solicitud en el panel de administración.</p>`,
        }),
      ),
    );
  }
}
