import { PartialType } from '@nestjs/mapped-types';
import { CreateLessonDto } from './create-lesson.dto';

/**
 * UpdateLessonDto — DTO para actualizar lecciones
 *
 * PartialType() es una utilidad de NestJS que toma TODOS los campos de
 * CreateLessonDto (title, description, duration, videoUrl) y los hace
 * OPCIONALES. Así puedes enviar solo los campos que quieras cambiar.
 *
 * Ejemplo: si solo quieres cambiar el título, envías { title: "Nuevo" }
 * y los validadores de @IsString() siguen aplicando, pero solo a los
 * campos que envíes.
 */
export class UpdateLessonDto extends PartialType(CreateLessonDto) { }
