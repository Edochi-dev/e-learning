import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  MaxLength,
  IsUUID,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * RecipientDto — Un destinatario de certificado.
 *
 * Modo HÍBRIDO:
 *   - `name` siempre requerido (es lo que se imprime en el PDF).
 *   - `userId` OPCIONAL: si el admin eligió un alumno registrado, se manda su
 *     id y el certificado queda ligado a esa cuenta (aparecerá en "mis
 *     certificados"). Si es un nombre libre (alguien sin cuenta), se omite.
 */
export class RecipientDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
  @MaxLength(100, { message: 'Cada nombre debe tener 100 caracteres o menos' })
  name: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class GenerateCertificateBatchDto {
  @IsUUID()
  templateId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100, {
    message: 'Cannot generate more than 100 certificates per batch',
  })
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients: RecipientDto[];
}
