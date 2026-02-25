import { IsString, IsNumber, IsBoolean, IsOptional, ValidateNested, IsArray } from 'class-validator';
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

    @IsNumber()
    price: number;

    @IsString()
    description: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateLessonDto)
    @IsOptional()
    lessons?: CreateLessonDto[];
}
