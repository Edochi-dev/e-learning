import { Course } from '@maris-nails/shared';
import { PaginatedResult } from '../../common/types/paginated-result.type';

/**
 * CourseGateway — Contrato abstracto para operaciones de cursos.
 *
 * Solo contiene métodos relacionados con la entidad Course.
 * Las operaciones de lecciones viven en LessonGateway (ISP).
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

  abstract isThumbnailUrlInUse(thumbnailUrl: string): Promise<boolean>;
}
