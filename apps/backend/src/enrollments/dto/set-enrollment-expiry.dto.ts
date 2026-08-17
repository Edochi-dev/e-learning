import { IsDateString, IsOptional, ValidateIf } from 'class-validator';

/**
 * Cuerpo de PATCH /enrollments/:id/expiry.
 *
 * `expiresAt: null` es un valor con significado propio —acceso permanente—, no
 * un campo ausente, así que se acepta explícitamente en vez de descartarlo.
 */
export class SetEnrollmentExpiryDto {
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  @IsOptional()
  expiresAt: string | null;
}
