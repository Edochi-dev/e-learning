import { SetMetadata } from '@nestjs/common';

/**
 * Opciones del decorador @EnrollmentCheck().
 *
 * Le dice al EnrollmentGuard DÓNDE buscar el identificador para
 * resolver el courseId y verificar que la alumna esté matriculada.
 *
 * Tres modos:
 *
 *   1. courseId directo — el request solo trae el courseId:
 *      @EnrollmentCheck({ courseIdFrom: 'params' })  → lee req.params.courseId
 *
 *      NOTA: 'query' es necesario para endpoints multipart (FileInterceptor)
 *      porque los guards corren ANTES de Multer → req.body está vacío.
 *
 *   2. Resolver desde lessonId — el request solo trae lessonId:
 *      @EnrollmentCheck({ lessonIdFrom: 'params' })
 *      El guard busca la lección y usa SU courseId.
 *
 *   3. Ambos — el request trae lessonId Y courseId, y el use case usa los dos:
 *      @EnrollmentCheck({ lessonIdFrom: 'body', courseIdFrom: 'body' })
 *      Manda el curso de la lección; el courseId del cliente solo se verifica.
 *      Si no coinciden, 403. Sin esto, enviar el lessonId de un curso ajeno con
 *      el courseId de uno propio pasaría el control.
 *
 * ¿Por qué es metadata y no lógica en el decorator?
 *   El decorador es DECLARATIVO (QUÉ verificar); el guard es IMPERATIVO (CÓMO).
 *   Así se cambia la implementación sin tocar cada controller.
 */
export interface EnrollmentCheckOptions {
  /**
   * Dónde leer el courseId. Si además hay lessonIdFrom, este valor NO decide el
   * curso: solo se comprueba que coincida con el de la lección.
   */
  courseIdFrom?: 'body' | 'params' | 'query';

  /** Lee lessonId del body, params o query para resolver → courseId. */
  lessonIdFrom?: 'body' | 'params' | 'query';

  /** Nombre del campo que contiene el lessonId (default: 'lessonId'). */
  lessonIdField?: string;
}

export const ENROLLMENT_CHECK_KEY = 'enrollment_check';

export const EnrollmentCheck = (options: EnrollmentCheckOptions) =>
  SetMetadata(ENROLLMENT_CHECK_KEY, options);
