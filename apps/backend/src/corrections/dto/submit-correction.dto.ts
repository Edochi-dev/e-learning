import { IsUUID } from 'class-validator';

/**
 * SubmitCorrectionDto — Datos que acompañan al upload de la foto.
 *
 * El archivo viene como multipart/form-data (campo 'photo'),
 * pero los metadatos vienen como campos del form:
 *   - lessonId: qué lección está entregando
 *   - courseId: para verificar que está matriculada (ownership check)
 */
export class SubmitCorrectionDto {
  @IsUUID()
  lessonId: string;

  @IsUUID()
  courseId: string;
}
