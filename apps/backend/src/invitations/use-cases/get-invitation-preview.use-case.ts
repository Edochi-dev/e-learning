import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { InvitationPreview } from '@maris-nails/shared';
import { InvitationGateway } from '../gateways/invitation.gateway';

/**
 * GetInvitationPreviewUseCase — Qué ve la alumna al abrir su enlace.
 *
 * SOLO LEE. Es lo que permite que el enlace se pueda abrir, cerrar y volver a
 * abrir sin gastarse: el canje va aparte, en un POST.
 *
 * Devuelve el estado aunque la invitación ya no sirva, en vez de un 404 seco:
 * "este enlace ya se usó" y "este enlace caducó" mandan a la alumna a hacer
 * cosas distintas, y ninguna de las dos es quedarse mirando un error.
 */
@Injectable()
export class GetInvitationPreviewUseCase {
  constructor(private readonly invitationGateway: InvitationGateway) {}

  async execute(token: string): Promise<InvitationPreview> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const invitation = await this.invitationGateway.findByTokenHash(tokenHash);
    if (!invitation) {
      throw new NotFoundException('Esta invitación no existe');
    }

    const course = invitation.course;

    return {
      status: invitation.status(),
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl ?? null,
      },
      accessDurationDays: course.accessDurationDays ?? null,
    };
  }
}
