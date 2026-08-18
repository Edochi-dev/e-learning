import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { InvitationGateway } from '../gateways/invitation.gateway';
import { InvitationUnitOfWork } from '../gateways/invitation-unit-of-work.gateway';
import { CourseGateway } from '../../courses/gateways/course.gateway';

/**
 * ClaimInvitationUseCase — Una alumna que YA tiene cuenta usa una invitación.
 *
 * Mismo enlace y mismas garantías que el canje, pero sin crear cuenta: aquí
 * solo se matricula y se gasta la invitación. Existe separado porque son dos
 * intenciones distintas —"me doy de alta" y "añado un curso a mi cuenta"— y
 * mezclarlas en un use case obligaría a ramificar por si hay sesión o no.
 */
@Injectable()
export class ClaimInvitationUseCase {
  constructor(
    private readonly invitationGateway: InvitationGateway,
    private readonly unitOfWork: InvitationUnitOfWork,
    private readonly courseGateway: CourseGateway,
  ) {}

  async execute(token: string, userId: string): Promise<{ courseId: string }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const invitation = await this.invitationGateway.findByTokenHash(tokenHash);
    if (!invitation) {
      throw new NotFoundException('Esta invitación no existe');
    }

    const now = new Date();
    if (!invitation.isRedeemable(now)) {
      throw new ForbiddenException({
        message: 'Esta invitación ya no es válida',
        status: invitation.status(now),
      });
    }

    const course = await this.courseGateway.findOne(invitation.courseId);
    if (!course) {
      throw new NotFoundException('El curso de esta invitación ya no existe');
    }

    const expiresAt = course.accessExpiresAt(now);

    return this.unitOfWork.run(async (tx) => {
      const existing = await tx.enrollments.findByUserAndCourse(
        userId,
        invitation.courseId,
      );

      // Gastar el enlace en alguien que ya tiene el curso lo desperdiciaría, y
      // la profesora habría "usado" una invitación sin dar acceso a nadie.
      if (existing?.isActive(now)) {
        throw new ConflictException('Ya tienes acceso a este curso');
      }

      // Con una matrícula vencida se renueva la fila existente: crear otra
      // chocaría contra el UNIQUE(userId, courseId).
      if (existing) {
        await tx.enrollments.updateExpiry(existing.id, expiresAt);
      } else {
        await tx.enrollments.enroll({
          userId,
          courseId: invitation.courseId,
          expiresAt,
        });
      }

      const won = await tx.invitations.markRedeemed(invitation.id, userId, now);
      if (!won) {
        throw new ConflictException('Esta invitación acaba de ser utilizada');
      }

      return { courseId: invitation.courseId };
    });
  }
}
