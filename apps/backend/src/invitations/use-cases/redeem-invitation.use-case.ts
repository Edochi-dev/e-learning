import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@maris-nails/shared';
import { InvitationGateway } from '../gateways/invitation.gateway';
import { InvitationUnitOfWork } from '../gateways/invitation-unit-of-work.gateway';
import { CourseGateway } from '../../courses/gateways/course.gateway';
import { User } from '../../users/entities/user.entity';

export interface RedeemInvitationInput {
  token: string;
  fullName: string;
  email: string;
  password: string;
}

/**
 * RedeemInvitationUseCase — La alumna abre su enlace y entra al curso.
 *
 * Hace tres cosas que deben pasar todas o ninguna: crear la cuenta, matricular
 * y gastar la invitación. Por eso el trabajo va dentro de un Unit of Work.
 *
 * Reparto de responsabilidades con la base de datos: el código comprueba lo que
 * puede razonar (el enlace existe, no ha caducado, el email está libre) y
 * PostgreSQL arbitra lo que el código no puede garantizar solo — que de dos
 * personas abriendo el mismo enlace a la vez, entre exactamente una.
 */
@Injectable()
export class RedeemInvitationUseCase {
  constructor(
    private readonly invitationGateway: InvitationGateway,
    private readonly unitOfWork: InvitationUnitOfWork,
    private readonly courseGateway: CourseGateway,
  ) {}

  async execute(input: RedeemInvitationInput): Promise<User> {
    const tokenHash = createHash('sha256').update(input.token).digest('hex');

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

    // El vencimiento del acceso se cuenta desde AHORA, no desde que se generó
    // el enlace: quien canjea el último día de vigencia recibe el periodo
    // completo que pagó, no lo que quedaba del enlace.
    const expiresAt = course.accessExpiresAt(now);

    const passwordHash = await bcrypt.hash(
      input.password,
      await bcrypt.genSalt(10),
    );

    return this.unitOfWork.run(async (tx) => {
      const existingUser = await tx.users.findByEmail(input.email);
      if (existingUser) {
        // Tiene cuenta: debe iniciar sesión y usar el enlace desde ahí, para no
        // acabar con dos cuentas y el curso en la que no usa.
        throw new ConflictException(
          'Ya existe una cuenta con este correo. Inicia sesión para activar tu invitación.',
        );
      }

      const user = new User();
      user.email = input.email;
      user.fullName = input.fullName;
      user.password = passwordHash;
      user.role = UserRole.STUDENT;

      const created = await tx.users.create(user);

      await tx.enrollments.enroll({
        userId: created.id,
        courseId: invitation.courseId,
        expiresAt,
      });

      // Va al final y decide el desenlace: si otra petición ganó la carrera,
      // esto devuelve false y la excepción revierte la cuenta y la matrícula
      // que acabamos de crear. El perdedor no deja rastro.
      const won = await tx.invitations.markRedeemed(
        invitation.id,
        created.id,
        now,
      );

      if (!won) {
        throw new ConflictException('Esta invitación acaba de ser utilizada');
      }

      return created;
    });
  }
}
