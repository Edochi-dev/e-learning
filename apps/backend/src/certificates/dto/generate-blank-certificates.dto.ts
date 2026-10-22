import { IsISO8601, IsInt, Matches, Max, Min } from 'class-validator';

export const MAX_BLANK_COPIES = 50;

export class GenerateBlankCertificatesDto {
  // Del navegador, como en la emisión: el "hoy" del servidor puede ser otro día.
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'certificateDate debe tener el formato YYYY-MM-DD',
  })
  @IsISO8601(
    { strict: true },
    { message: 'certificateDate no es una fecha válida' },
  )
  certificateDate: string;

  @IsInt({ message: 'copies debe ser un número entero' })
  @Min(1, { message: 'Se necesita al menos 1 copia' })
  @Max(MAX_BLANK_COPIES, {
    message: `No se pueden generar más de ${MAX_BLANK_COPIES} copias a la vez`,
  })
  copies: number;
}
