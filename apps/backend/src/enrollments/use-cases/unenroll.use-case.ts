import { Injectable } from '@nestjs/common';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';

/**
 * UnenrollUseCase — Elimina una matrícula (el alumno se da de baja de un curso).
 *
 * Este Use Case es simple porque el check de propiedad (¿es mi matrícula?)
 * ya fue hecho por el EnrollmentOwnershipGuard ANTES de llegar aquí.
 *
 * Separar esto en un Use Case (en lugar de llamar al gateway desde el controller)
 * nos permite agregar lógica futura sin tocar el controlador:
 *   - Enviar email de confirmación
 *   - Registrar en un log de auditoría
 *   - Invalidar suscripciones de pago
 */
@Injectable()
export class UnenrollUseCase {
  constructor(private readonly enrollmentGateway: EnrollmentGateway) {}

  async execute(enrollmentId: string): Promise<void> {
    return this.enrollmentGateway.delete(enrollmentId);
  }
}
