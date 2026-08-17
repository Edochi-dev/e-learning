import { Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { Enrollment } from '../entities/enrollment.entity';

/**
 * SetEnrollmentExpiryUseCase — La profesora fija hasta cuándo dura un acceso.
 *
 * Una sola operación cubre los tres casos que necesita: extender (fecha más
 * lejana), recortar (fecha más cercana) y volver permanente (null). Tener un
 * "extender N días" aparte añadiría un segundo camino que puede divergir del
 * primero sin ganar nada: la fecha resultante ya se ve antes de confirmar.
 */
@Injectable()
export class SetEnrollmentExpiryUseCase {
  constructor(private readonly enrollmentGateway: EnrollmentGateway) {}

  async execute(
    enrollmentId: string,
    expiresAt: Date | null,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentGateway.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundException('Matrícula no encontrada');
    }

    await this.enrollmentGateway.updateExpiry(enrollmentId, expiresAt);

    enrollment.expiresAt = expiresAt;
    return enrollment;
  }
}
