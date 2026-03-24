import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];
}
