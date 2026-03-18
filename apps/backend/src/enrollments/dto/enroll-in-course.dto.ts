import { IsUUID } from 'class-validator';

/**
 * EnrollInCourseDto — Datos que el frontend envía para matricularse en un curso.
 *
 * Solo necesitamos el courseId porque el userId NUNCA viene del body:
 * siempre lo extraemos del JWT. Así el usuario no puede hacerse pasar por otro.
 *
 * @IsUUID() valida que el string tenga formato uuid v4 antes de llegar al Use Case.
 */
export class EnrollInCourseDto {
  @IsUUID()
  courseId: string;
}
