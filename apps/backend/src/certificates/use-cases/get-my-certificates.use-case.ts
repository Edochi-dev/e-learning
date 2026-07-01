import { Injectable } from '@nestjs/common';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { Certificate } from '../entities/certificate.entity';

/**
 * GetMyCertificatesUseCase — Devuelve los certificados del alumno autenticado.
 *
 * Solo trae los certificados ligados a su cuenta (userId). Los certificados
 * emitidos "por nombre libre" (sin userId) no aparecen aquí — para esos existe
 * la verificación pública por número.
 */
@Injectable()
export class GetMyCertificatesUseCase {
  constructor(private readonly certificateGateway: CertificateGateway) {}

  async execute(userId: string): Promise<Certificate[]> {
    return this.certificateGateway.findByUser(userId);
  }
}
