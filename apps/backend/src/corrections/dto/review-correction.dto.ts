import { IsIn, IsNotEmpty, IsString } from 'class-validator';

/**
 * ReviewCorrectionDto — Datos que envía la profesora al revisar una entrega.
 *
 * action:   'approve' o 'reject'. Solo dos opciones posibles.
 *           Usamos @IsIn en vez de un enum porque este valor solo existe
 *           en el transporte HTTP — el dominio usa el campo `status` de
 *           la entidad (que es 'approved' o 'rejected').
 *
 * feedback: Texto obligatorio. La profesora SIEMPRE debe dar retroalimentación,
 *           tanto si aprueba ("¡Excelente trabajo!") como si rechaza
 *           ("Revisa el ángulo de la lima"). Esto mejora la experiencia
 *           de la alumna y deja un audit trail completo.
 */
export class ReviewCorrectionDto {
  @IsIn(['approve', 'reject'], {
    message: 'action must be either "approve" or "reject"',
  })
  action: 'approve' | 'reject';

  @IsString()
  @IsNotEmpty({
    message: 'feedback is required — always explain your decision',
  })
  feedback: string;
}
