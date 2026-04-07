import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

/**
 * EditCertificateTemplateDto — DTO de edición parcial de una plantilla.
 *
 * TODOS los campos son opcionales porque el admin puede editar:
 *   - Solo metadata (renombrar la plantilla, cambiar la abreviatura)
 *   - Solo el archivo PDF base (subir una versión actualizada del diseño)
 *   - Ambas cosas a la vez
 *
 * El archivo PDF NO viaja en este DTO — viaja en multipart como `file`,
 * separado, capturado por el controller con @UploadedFile().
 *
 * El use case orquesta qué se actualiza: solo escribe en BD los campos
 * que efectivamente vinieron en la petición. Los demás se quedan tal cual.
 *
 * Nota arquitectónica: el diseño visual (nameStyle/qrStyle/dateStyle) NO se
 * edita por aquí — tiene su propio endpoint PATCH /:id/design
 * (Single Responsibility Principle). Este endpoint es para metadata + PDF.
 */
export class EditCertificateTemplateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  courseAbbreviation?: string;

  @IsOptional()
  @IsString()
  @IsIn(['A4 Vertical', 'A4 Horizontal', 'A3 Vertical', 'A3 Horizontal'])
  paperFormat?: string;
}
