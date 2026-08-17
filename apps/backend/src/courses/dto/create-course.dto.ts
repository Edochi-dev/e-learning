import {
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
  ValidateIf,
  IsArray,
  IsIn,
  IsInt,
  Min,
} from 'class-validator';

import { Type, Transform } from 'class-transformer';
import { CourseLevel } from '@maris-nails/shared';

class CreateLessonDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  duration: string;

  @IsString()
  videoUrl: string;
}

export class CreateCourseDto {
  @IsString()
  title: string;

  // @Type(() => Number) le dice a class-transformer que convierta el string "49.99"
  // (que llega en multipart/form-data) al número 49.99 antes de validar con @IsNumber().
  @Type(() => Number)
  @IsNumber()
  price: number;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  category?: string;

  // Valores permitidos = fuente única CourseLevel de @maris-nails/shared.
  @IsIn(Object.values(CourseLevel))
  @IsOptional()
  level?: CourseLevel;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  /**
   * Días de acceso que otorga una matrícula. null / vacío = permanente.
   * Llega como string en multipart, de ahí el Transform explícito: un campo
   * vacío del formulario debe significar "permanente", no 0.
   */
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? null
      : Number(value),
  )
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @IsOptional()
  accessDurationDays?: number | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLessonDto)
  @IsOptional()
  lessons?: CreateLessonDto[];
}
