import { CourseLevel } from '@maris-nails/shared';

/**
 * COURSE_LEVEL_OPTIONS — Fuente ÚNICA de las opciones de nivel en la UI.
 *
 * Los valores vienen del enum compartido `CourseLevel` (una sola fuente de
 * verdad para "qué niveles existen"); las etiquetas en español se definen aquí
 * una sola vez. Lo usan el catálogo (filtro) y los formularios de admin
 * (crear/editar), para no repetir la lista en cada página.
 */
export const COURSE_LEVEL_OPTIONS: { value: CourseLevel; label: string }[] = [
    { value: CourseLevel.BEGINNER, label: 'Principiante' },
    { value: CourseLevel.INTERMEDIATE, label: 'Intermedio' },
    { value: CourseLevel.ADVANCED, label: 'Avanzado' },
];
