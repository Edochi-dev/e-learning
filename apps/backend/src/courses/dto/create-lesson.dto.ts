import { IsString } from 'class-validator';

export class CreateLessonDto {
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsString()
    duration: string;

    @IsString()
    videoUrl: string;
}
