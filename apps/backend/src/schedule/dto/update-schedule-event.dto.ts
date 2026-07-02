import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

/**
 * UpdateScheduleEventDto — Actualización parcial de un evento (mover, estirar,
 * renombrar). Todos los campos opcionales; se escriben solo los presentes.
 */
export class UpdateScheduleEventDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El nombre del evento no puede quedar vacío.' })
  @MaxLength(80, {
    message: 'El nombre es demasiado largo (máx. 80 caracteres).',
  })
  title?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'startAt debe ser una fecha/hora válida (ISO).' },
  )
  startAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endAt debe ser una fecha/hora válida (ISO).' })
  endAt?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Las notas son demasiado largas (máx. 500).' })
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  reminderMinutesBefore?: number;
}
