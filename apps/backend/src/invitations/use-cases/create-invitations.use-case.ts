import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { InvitationGateway } from '../gateways/invitation.gateway';
import { CourseGateway } from '../../courses/gateways/course.gateway';

export interface CreatedInvitation {
  id: string;
  /** Token EN CLARO. Solo existe aquí y en el enlace: no se guarda. */
  token: string;
  label: string | null;
  expiresAt: Date;
}

/** Vigencia por defecto del enlace si la profesora no indica otra. */
const DEFAULT_LINK_VALIDITY_DAYS = 30;

/**
 * CreateInvitationsUseCase — Genera enlaces de un solo uso, en lote.
 *
 * En lote porque el trabajo real de la profesora es repartir un enlace a cada
 * persona de un grupo de WhatsApp: pedirlos de uno en uno convertiría una tarde
 * de ventas en una sesión de clics.
 *
 * El token se devuelve en claro UNA vez, al generarlo. En la base de datos solo
 * queda su sha256, así que ni siquiera desde el panel se puede recuperar el
 * enlace de una invitación ya creada: si se pierde, se genera otra y se revoca
 * la anterior.
 */
@Injectable()
export class CreateInvitationsUseCase {
  constructor(
    private readonly invitationGateway: InvitationGateway,
    private readonly courseGateway: CourseGateway,
  ) {}

  async execute(
    courseId: string,
    createdByUserId: string,
    labels: (string | null)[],
    validityDays: number = DEFAULT_LINK_VALIDITY_DAYS,
  ): Promise<CreatedInvitation[]> {
    const course = await this.courseGateway.findOne(courseId);
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    // 32 bytes de randomBytes: espacio de búsqueda imposible de recorrer por
    // fuerza bruta, y además el endpoint público va con rate limiting.
    const tokens = labels.map(() => randomBytes(32).toString('hex'));

    const created = await this.invitationGateway.createMany(
      tokens.map((token, index) => ({
        tokenHash: createHash('sha256').update(token).digest('hex'),
        courseId,
        expiresAt,
        createdByUserId,
        label: labels[index],
      })),
    );

    // El orden de createMany se corresponde con el de entrada, así que cada
    // invitación guardada se empareja con el token en claro que la generó.
    return created.map((invitation, index) => ({
      id: invitation.id,
      token: tokens[index],
      label: invitation.label,
      expiresAt: invitation.expiresAt,
    }));
  }
}
