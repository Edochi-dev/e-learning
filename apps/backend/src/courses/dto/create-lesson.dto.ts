import { IsString, IsBoolean, IsUrl } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  duration: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  videoUrl: string;

  @IsBoolean()
  isLive: boolean;
}
