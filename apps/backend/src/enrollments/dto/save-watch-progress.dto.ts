import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { WATCH_SEGMENTS } from '../../progress/domain/watched-segments';

export class SaveWatchProgressDto {
  @IsUUID()
  lessonId: string;

  @IsUUID()
  courseId: string;

  /** Índices (0-99) de los segmentos de 1% vistos en esta sesión. */
  @IsArray()
  @ArrayMaxSize(WATCH_SEGMENTS)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(WATCH_SEGMENTS - 1, { each: true })
  segments: number[];
}
