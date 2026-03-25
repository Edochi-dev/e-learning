import { PartialType } from '@nestjs/mapped-types';
import { CreateLessonDto } from './create-lesson.dto';

/**
 * UpdateLessonDto — DTO para actualizar lecciones (class o exam).
 *
 * PartialType() toma TODOS los campos de CreateLessonDto y los hace OPCIONALES.
 * Así puedes enviar solo los campos que quieras cambiar.
 *
 * Hereda automáticamente los campos de quiz (type, passingScore, questions)
 * y sus validaciones condicionales (@ValidateIf).
 */
export class UpdateLessonDto extends PartialType(CreateLessonDto) {}
