import { IsUUID, IsNumber, Min, Max } from 'class-validator';

export class SaveWatchProgressDto {
  @IsUUID()
  lessonId: string;

  @IsUUID()
  courseId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percent: number;
}
