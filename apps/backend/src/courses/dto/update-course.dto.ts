import {
  IsString,
  IsNumber,
  IsOptional,
  ValidateIf,
  IsArray,
  IsIn,
  IsInt,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CourseLevel } from '@maris-nails/shared';

// Definimos los campos actualizables explícitamente en lugar de usar PartialType(CreateCourseDto).
// Esto nos permite excluir thumbnailUrl: la miniatura solo se puede cambiar subiendo
// un archivo binario (multipart), nunca enviando una URL de texto libre.
export class UpdateCourseDto {
  @IsString()
  @IsOptional()
  title?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

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
}
