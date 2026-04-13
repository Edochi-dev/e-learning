import { IsUUID } from 'class-validator';

/**
 * SubmitCorrectionDto — Datos que acompañan al upload de la foto.
 *
 * El archivo viene como multipart/form-data (campo 'photo'),
 * y lessonId como campo del form.
 *
 * courseId viene como QUERY PARAM (no en el body) porque el
 * EnrollmentGuard lo necesita ANTES de que Multer parsee el body.
 * Los guards corren antes que los interceptors en NestJS.
 */
export class SubmitCorrectionDto {
  @IsUUID()
  lessonId: string;
}
