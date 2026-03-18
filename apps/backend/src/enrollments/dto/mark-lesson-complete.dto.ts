import { IsUUID } from 'class-validator';

/**
 * MarkLessonCompleteDto — Datos para marcar una lección como completada.
 *
 * ¿Por qué enviamos courseId si ya tenemos lessonId?
 *   El Use Case necesita verificar que el usuario está matriculado en el curso
 *   antes de permitirle guardar progreso (check de ownership).
 *   Con el courseId podemos hacer esa verificación en una sola query,
 *   sin necesidad de cargar la lección + su relación course.
 *
 *   El frontend ya conoce el courseId porque el usuario está dentro de esa página.
 */
export class MarkLessonCompleteDto {
  @IsUUID()
  lessonId: string;

  @IsUUID()
  courseId: string;
}
