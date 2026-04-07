import {
  IsNumber,
  IsString,
  IsBoolean,
  Matches,
  Min,
  Max,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const ALIGN_VALUES = ['left', 'center'] as const;

/**
 * NameStyleDto — Validación del value object de estilo del nombre.
 *
 * Cada sub-DTO valida los campos de su grupo.
 * @ValidateNested() en el padre delega la validación al sub-DTO.
 * @Type(() => NameStyleDto) le dice a class-transformer cómo instanciar
 * el objeto plano que llega del JSON body.
 */
export class NameStyleDto {
  @IsNumber()
  @Min(0)
  @Max(2000)
  positionX: number;

  @IsNumber()
  @Min(0)
  @Max(2000)
  positionY: number;

  @IsNumber()
  @Min(1)
  @Max(300)
  fontSize: number;

  @Matches(HEX_COLOR, {
    message: 'color must be a valid hex color (#RRGGBB)',
  })
  color: string;

  @IsString()
  fontFamily: string;

  @IsIn(ALIGN_VALUES)
  align: 'left' | 'center';
}

export class QrStyleDto {
  @IsNumber()
  @Min(0)
  @Max(2000)
  positionX: number;

  @IsNumber()
  @Min(0)
  @Max(2000)
  positionY: number;

  @IsNumber()
  @Min(10)
  @Max(500)
  size: number;
}

export class DateStyleDto {
  @IsBoolean()
  show: boolean;

  @IsNumber()
  @Min(0)
  @Max(2000)
  positionX: number;

  @IsNumber()
  @Min(0)
  @Max(2000)
  positionY: number;

  @IsNumber()
  @Min(1)
  @Max(300)
  fontSize: number;

  @Matches(HEX_COLOR, {
    message: 'color must be a valid hex color (#RRGGBB)',
  })
  color: string;

  @IsString()
  fontFamily: string;

  @IsIn(ALIGN_VALUES)
  align: 'left' | 'center';
}

/**
 * UpdateTemplateDesignDto — DTO completo del diseño visual de una plantilla.
 *
 * El frontend envía un JSON con 3 objetos nested:
 *   { nameStyle: {...}, qrStyle: {...}, dateStyle: {...} }
 *
 * Incluye TODO el diseño visual, no solo coordenadas: posiciones,
 * tipografía, tamaños, colores, alineaciones y visibilidad. El nombre
 * "design" refleja honestamente lo que el DTO representa — el nombre
 * anterior ("positions") era engañoso.
 *
 * @ValidateNested() + @Type() aseguran que class-validator
 * valide DENTRO de cada sub-objeto, no solo en el nivel raíz.
 */
export class UpdateTemplateDesignDto {
  @ValidateNested()
  @Type(() => NameStyleDto)
  nameStyle: NameStyleDto;

  @ValidateNested()
  @Type(() => QrStyleDto)
  qrStyle: QrStyleDto;

  @ValidateNested()
  @Type(() => DateStyleDto)
  dateStyle: DateStyleDto;
}
