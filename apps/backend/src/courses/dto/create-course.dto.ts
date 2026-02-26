import { IsString, IsNumber, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

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

    // thumbnailUrl lo rellena el use-case después de guardar el archivo.
    // El cliente nunca envía este campo — envía el archivo binario por separado.
    @IsString()
    @IsOptional()
    thumbnailUrl?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateLessonDto)
    @IsOptional()
    lessons?: CreateLessonDto[];
}
