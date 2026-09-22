import { Injectable, NotFoundException } from '@nestjs/common';
import { CertificateGateway } from '../gateways/certificate.gateway';

/**
 * Deja el nombre en una forma comparable: sin tildes, sin mayúsculas y con los
 * espacios colapsados.
 *
 * Sin esto la verificación fallaría para las propias alumnas por motivos
 * absurdos — "María José" contra "maria jose", o un espacio de más al pegar el
 * nombre desde el PDF. Una comprobación de seguridad que rechaza a la persona
 * legítima no es segura, es inservible.
 *
 * NFD separa cada letra de su tilde, y \u0300-\u036f es el bloque de tildes
 * sueltas de Unicode, así que la 'í' acaba en 'i'.
 */
function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * LookupCertificateUseCase
 *
 * Búsqueda pública de certificado por número correlativo y nombre del titular.
 * Devuelve solo el UUID para que el frontend redirija a /certificados/:id.
 * No expone datos sensibles del lote ni del template.
 */
@Injectable()
export class LookupCertificateUseCase {
  constructor(private readonly certificateGateway: CertificateGateway) {}

  async execute(
    certificateNumber: string,
    recipientName: string,
  ): Promise<{ id: string }> {
    const cert = await this.certificateGateway.findByNumber(
      certificateNumber.toUpperCase().trim(),
    );

    // El mismo 404 para "no existe" y para "el nombre no coincide", y es
    // deliberado: distinguirlos delataría qué números están emitidos, que es
    // justo el primer paso de la cosecha que esto viene a impedir.
    if (
      !cert ||
      normalizeName(cert.recipientName) !== normalizeName(recipientName)
    ) {
      throw new NotFoundException('Certificado no encontrado');
    }

    return { id: cert.id };
  }
}
