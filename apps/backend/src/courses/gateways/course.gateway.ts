import { Course } from '../entities/course.entity';
import { PaginatedResult } from '../../common/types/paginated-result.type';

/**
 * CourseGateway — Contrato abstracto para operaciones de cursos.
 *
 * Solo contiene métodos relacionados con la entidad Course.
 * Las operaciones de lecciones viven en LessonGateway (ISP).
 *
 * IMPORTANTE: usa la entidad TypeORM del backend, NO la interfaz de @maris-nails/shared.
 * El paquete shared define la forma de los datos que viajan por HTTP (lo que ve el frontend).
 * Los gateways son contratos internos del backend — trabajan con entidades reales
 * que tienen relaciones, decoradores y estructura propia de TypeORM.
 * El Controller es quien traduce entre ambos mundos al serializar la respuesta.
 */
export abstract class CourseGateway {
  abstract create(course: Course): Promise<Course>;

  abstract findAll(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Course>>;

  abstract findOne(id: string): Promise<Course | null>;

  abstract update(id: string, data: Partial<Course>): Promise<Course>;

  abstract delete(id: string): Promise<void>;

  /**
   * ¿Algún curso usa esta thumbnailUrl? Útil DESPUÉS de borrar el curso,
   * cuando ya no necesitamos excluirlo de la búsqueda.
   */
  abstract isThumbnailUrlInUse(thumbnailUrl: string): Promise<boolean>;

  /**
   * ¿Algún OTRO curso (distinto a excludeCourseId) usa esta thumbnailUrl?
   *
   * Espejo de LessonGateway.isVideoUrlReferenced — se usa cuando el curso
   * AÚN existe en la DB con ese thumbnailUrl asignado y queremos saber si
   * algún otro lo comparte antes de borrar el archivo del storage.
   */
  abstract isThumbnailUrlReferenced(
    thumbnailUrl: string,
    excludeCourseId: string,
  ): Promise<boolean>;
}
