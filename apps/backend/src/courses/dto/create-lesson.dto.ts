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
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonType } from '@maris-nails/shared';

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
  @ValidateIf((o) => o.type === 'class')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  videoUrl?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @ValidateIf((o) => o.type === 'class')
  @IsBoolean()
  isLive?: boolean;

  // ─── Campos exclusivos de type='exam' ──────────────────────────────

  @ValidateIf((o) => o.type === 'exam')
  @IsInt()
  @Min(1)
  passingScore?: number;

  @ValidateIf((o) => o.type === 'exam')
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuizQuestionDto)
  questions?: CreateQuizQuestionDto[];

  // ─── Campos exclusivos de type='correction' ────────────────────────

  @ValidateIf((o) => o.type === 'correction')
  @IsString()
  referenceImageUrl?: string;

  @ValidateIf((o) => o.type === 'correction')
  @IsString()
  instructions?: string;
}
