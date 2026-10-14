import {
  IsString,
  IsBoolean,
  IsUrl,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  ValidateIf,
  Matches,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonType } from '@maris-nails/shared';

const WITH_TIME_ZONE = /(Z|[+-]\d{2}:\d{2})$/;
const TIME_ZONE_MESSAGE =
  'La fecha/hora de la clase en vivo debe incluir su zona horaria.';

// ─── Sub-DTOs para las preguntas del quiz ──────────────────────────────

export class CreateQuizOptionDto {
  @IsString()
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuizQuestionDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsUUID()
  relatedLessonId?: string;

  // @ValidateNested + @Type: le dice a class-validator que cada elemento
  // del array es un objeto que también tiene decoradores de validación.
  // Sin @Type, class-validator vería objetos planos y no los validaría.
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuizOptionDto)
  options: CreateQuizOptionDto[];
}

// ─── DTO principal ─────────────────────────────────────────────────────

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  // El discriminador: 'class' (video), 'exam' (quiz) o 'correction' (tarea con foto).
  @IsIn([LessonType.CLASS, LessonType.EXAM, LessonType.CORRECTION])
  type: LessonType;

  // ─── Campos exclusivos de type='class' ─────────────────────────────

  // @ValidateIf(o => o.type === 'class') significa:
  // "solo valida este campo si type es 'class'".
  // Para exámenes o correcciones, videoUrl se ignora completamente.
  @ValidateIf((o: CreateLessonDto) => o.type === 'class')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  videoUrl?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @ValidateIf((o: CreateLessonDto) => o.type === 'class')
  @IsBoolean()
  isLive?: boolean;

  // Fecha/hora de la clase en vivo — OBLIGATORIA solo cuando isLive es true.
  // Si no es en vivo, el campo se ignora (ValidateIf lo salta).
  // An instant with its zone (Z or ±hh:mm): a bare "19:00" would make the
  // server guess whose 19:00 it is, and students live in several countries.
  @ValidateIf((o: CreateLessonDto) => o.type === 'class' && o.isLive === true)
  @IsDateString(
    {},
    { message: 'La clase en vivo requiere fecha/hora de inicio.' },
  )
  @Matches(WITH_TIME_ZONE, { message: TIME_ZONE_MESSAGE })
  liveStartsAt?: string;

  @ValidateIf((o: CreateLessonDto) => o.type === 'class' && o.isLive === true)
  @IsDateString({}, { message: 'La clase en vivo requiere fecha/hora de fin.' })
  @Matches(WITH_TIME_ZONE, { message: TIME_ZONE_MESSAGE })
  liveEndsAt?: string;

  // ─── Campos exclusivos de type='exam' ──────────────────────────────

  @ValidateIf((o: CreateLessonDto) => o.type === 'exam')
  @IsInt()
  @Min(1)
  passingScore?: number;

  @ValidateIf((o: CreateLessonDto) => o.type === 'exam')
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuizQuestionDto)
  questions?: CreateQuizQuestionDto[];

  // ─── Campos exclusivos de type='correction' ────────────────────────

  @ValidateIf((o: CreateLessonDto) => o.type === 'correction')
  @IsString()
  referenceImageUrl?: string;

  @ValidateIf((o: CreateLessonDto) => o.type === 'correction')
  @IsString()
  instructions?: string;
}
