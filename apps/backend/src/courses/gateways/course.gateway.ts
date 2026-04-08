import { Course } from '../entities/course.entity';
import { PaginatedResult } from '../../common/types/paginated-result.type';

/**
 * CreateCourseData — Datos para crear un curso desde la capa de aplicación.
 *
 * ¿Por qué un tipo aparte y no `Course` directamente?
 *
 * `Course` es la ENTIDAD DE PERSISTENCIA: tiene decoradores de TypeORM, un id
 * autogenerado, y relaciones (`lessons`) que solo existen una vez la fila vive
 * en la DB. Si los use cases tuvieran que pasar `Course`, estarían obligados a
 * fabricar objetos con forma de entidad — un detalle de la capa de infraestructura
 * que NO les corresponde.
 *
 * Este tipo describe exactamente lo que la capa de aplicación PUEDE escribir al
 * crear un curso. La repository se encarga de traducirlo a entidad TypeORM.
 *
 * Nota: las lecciones se agregan por separado vía `LessonGateway.addLesson`,
 * que sabe instanciar correctamente las entidades hijas (VideoLesson / ExamLesson)
 * según el tipo de lección. Por eso no aparecen aquí.
 */
export interface CreateCourseData {
  title: string;
  price: number;
  description: string;
  features?: string[];
  thumbnailUrl?: string;
}

/**
 * UpdateCourseData — Datos para actualizar un curso.
 *
 * Mismo principio que CreateCourseData: solo los campos que la capa de
 * aplicación tiene permitido modificar. Todos opcionales porque cada use case
 * actualiza un subconjunto distinto (texto, precio, thumbnail, etc.).
 */
export interface UpdateCourseData {
  title?: string;
  price?: number;
  description?: string;
  features?: string[];
  thumbnailUrl?: string;
}

/**
 * CourseGateway — Contrato abstracto para operaciones de cursos.
 *
 * Solo contiene métodos relacionados con la entidad Course.
 * Las operaciones de lecciones viven en LessonGateway (ISP).
 *
 * Los métodos que LEEN devuelven la entidad TypeORM (`Course`) porque la capa
 * de presentación necesita acceso a las relaciones cargadas. Los métodos que
 * ESCRIBEN reciben tipos de input planos (CreateCourseData / UpdateCourseData)
 * para que la capa de aplicación no tenga que fabricar formas de entidad.
 */
export abstract class CourseGateway {
  abstract create(data: CreateCourseData): Promise<Course>;

  abstract findAll(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Course>>;

  abstract findOne(id: string): Promise<Course | null>;

  abstract update(id: string, data: UpdateCourseData): Promise<Course>;

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
