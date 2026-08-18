import { Injectable } from '@nestjs/common';
import { InvitationStatus } from '@maris-nails/shared';
import { InvitationGateway } from '../gateways/invitation.gateway';

/** Fila del panel de la profesora. Sin token: en la base de datos solo hay hash. */
export interface CourseInvitationRow {
  id: string;
  label: string | null;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  redeemedAt: Date | null;
  redeemedBy: { fullName: string; email: string } | null;
}

@Injectable()
export class ListCourseInvitationsUseCase {
  constructor(private readonly invitationGateway: InvitationGateway) {}

  async execute(courseId: string): Promise<CourseInvitationRow[]> {
    const invitations = await this.invitationGateway.findByCourse(courseId);

    // Un solo instante para toda la lista: dos enlaces que caducan a la misma
    // hora no pueden reportar estados distintos.
    const now = new Date();

    return invitations.map((invitation) => ({
      id: invitation.id,
      label: invitation.label,
      status: invitation.status(now),
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      redeemedAt: invitation.redeemedAt,
      redeemedBy: invitation.redeemedBy
        ? {
            fullName: invitation.redeemedBy.fullName,
            email: invitation.redeemedBy.email,
          }
        : null,
    }));
  }
}
