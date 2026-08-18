import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInvitationsDto {
  /**
   * Una etiqueta por invitación: el tamaño del array decide cuántas se generan.
   * La etiqueta es una nota privada de la profesora ("María — grupo de marzo")
   * que le permite saber a quién dio cada enlace sin guardar datos personales
   * de alguien que todavía no tiene cuenta. Puede ir vacía.
   */
  @IsArray()
  @ArrayMinSize(1)
  // Tope por lote: no hay motivo legítimo para pedir miles de enlaces de golpe,
  // y sí lo hay para que un error de la UI no genere una avalancha.
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  labels: string[];

  /**
   * Días que el ENLACE sigue sirviendo. No confundir con la duración del
   * acceso, que cuenta desde el canje: son dos relojes distintos.
   */
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  validityDays?: number;
}
