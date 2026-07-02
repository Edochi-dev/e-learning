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
 * CreateScheduleEventDto — Datos para crear un evento de agenda.
 * Sin "tipo": solo un nombre libre con límite de caracteres + horas.
 */
export class CreateScheduleEventDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del evento es obligatorio.' })
  @MaxLength(80, {
    message: 'El nombre es demasiado largo (máx. 80 caracteres).',
  })
  title: string;

  @IsDateString(
    {},
    { message: 'startAt debe ser una fecha/hora válida (ISO).' },
  )
  startAt: string;

  @IsDateString({}, { message: 'endAt debe ser una fecha/hora válida (ISO).' })
  endAt: string;

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
