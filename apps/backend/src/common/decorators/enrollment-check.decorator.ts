import { SetMetadata } from '@nestjs/common';

/**
 * Opciones del decorador @EnrollmentCheck().
 *
 * Le dice al EnrollmentGuard DÓNDE buscar el identificador para
 * resolver el courseId y verificar que la alumna esté matriculada.
 *
 * Dos modos:
 *
 *   1. courseId directo — el request ya trae el courseId:
 *      @EnrollmentCheck({ courseIdFrom: 'body' })    → lee req.body.courseId
 *      @EnrollmentCheck({ courseIdFrom: 'params' })  → lee req.params.courseId
 *
 *   2. Resolver desde lessonId — el request solo trae lessonId:
 *      @EnrollmentCheck({ lessonIdFrom: 'params', lessonIdField: 'lessonId' })
 *      El guard busca la lección en la DB y extrae su courseId.
 *
 * ¿Por qué es metadata y no lógica en el decorator?
 *   Porque el decorator es DECLARATIVO — dice QUÉ verificar.
 *   El guard es IMPERATIVO — sabe CÓMO verificarlo.
 *   Así podemos cambiar la implementación del guard sin tocar
 *   los decoradores en cada controller.
 */
export interface EnrollmentCheckOptions {
  /** Lee courseId directamente del body o params. */
  courseIdFrom?: 'body' | 'params';

  /** Lee lessonId del body o params para resolver → courseId. */
  lessonIdFrom?: 'body' | 'params';

  /** Nombre del campo que contiene el lessonId (default: 'lessonId'). */
  lessonIdField?: string;
}

export const ENROLLMENT_CHECK_KEY = 'enrollment_check';

export const EnrollmentCheck = (options: EnrollmentCheckOptions) =>
  SetMetadata(ENROLLMENT_CHECK_KEY, options);
