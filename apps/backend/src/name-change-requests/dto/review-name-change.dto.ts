import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * ReviewNameChangeDto — Datos que envía el admin al revisar una solicitud.
 *
 * action:   'approve' o 'reject' (solo existe en el transporte HTTP; el dominio
 *           usa el campo `status`).
 * feedback: opcional. Recomendado al rechazar para explicar el motivo; puede ir
 *           vacío al aprobar.
 */
export class ReviewNameChangeDto {
  @IsIn(['approve', 'reject'], {
    message: 'action must be either "approve" or "reject"',
  })
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  feedback?: string;
}
