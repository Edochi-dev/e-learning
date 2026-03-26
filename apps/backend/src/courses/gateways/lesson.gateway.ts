import { Lesson } from '@maris-nails/shared';

/**
 * LessonGateway — Contrato abstracto para operaciones de lecciones.
 *
 * Segregado de CourseGateway siguiendo el Interface Segregation Principle (ISP):
 * los Use Cases que solo necesitan lecciones no deberían depender de
 * métodos de cursos que nunca van a usar.
 *
 * La implementación concreta (CoursesRepository) implementa AMBOS gateways.
 * La separación es a nivel de contrato, no de implementación.
 */
export abstract class LessonGateway {
  abstract addLesson(
    courseId: string,
    lesson: Partial<Lesson>,
  ): Promise<Lesson>;

  abstract removeLesson(lessonId: string): Promise<void>;

  abstract findLesson(lessonId: string): Promise<Lesson | null>;

  abstract updateLesson(
    lessonId: string,
    data: Partial<Lesson>,
  ): Promise<Lesson>;

  abstract reorderLessons(
    courseId: string,
    lessonIds: string[],
  ): Promise<void>;

  abstract findLessonWithQuestions(
    lessonId: string,
  ): Promise<Lesson | null>;

  abstract isVideoUrlReferenced(
    videoUrl: string,
    excludeLessonId: string,
  ): Promise<boolean>;

  abstract isVideoUrlInUse(videoUrl: string): Promise<boolean>;
}
