import { IsArray, IsUUID } from 'class-validator';

/**
 * ReorderLessonsDto — Valida el body del endpoint de reordenamiento
 *
 * El frontend envía un array de IDs de lecciones en el nuevo orden.
 * Ejemplo: ["uuid-3", "uuid-1", "uuid-2"]
 * Eso significa: lección 3 va primero, luego 1, luego 2.
 */
export class ReorderLessonsDto {
    @IsArray()
    @IsUUID('4', { each: true }) // Cada elemento del array debe ser un UUID v4 válido
    lessonIds: string[];
}
