import { Lesson } from '../entities/lessons.entity';
import { LessonType } from '@maris-nails/shared';

/**
 * LessonData — Tipo intermedio para crear/actualizar lecciones.
 *
 * ¿Por qué no usar Partial<Lesson> directamente?
 *
 * Porque la entidad Lesson usa Joined Table Inheritance:
 *   - videoUrl, isLive, duration → viven en VideoLesson (entidad hija)
 *   - passingScore → vive en ExamLesson (entidad hija)
 *   - questions → relación OneToMany con QuizQuestion
 *
 * Pero los DTOs del frontend envían todo en formato PLANO:
 *   { title, type, videoUrl, isLive, passingScore, questions }
 *
 * Este tipo permite que el gateway reciba datos planos sin necesidad
 * de que el Use Case conozca la estructura interna de las entidades hijas.
 * El repositorio es quien sabe cómo repartir los campos entre las tablas.
 */
export interface LessonData {
  title?: string;
  description?: string;
  type?: LessonType;
  // Campos de video (type='class')
  videoUrl?: string;
  duration?: string;
  isLive?: boolean;
  // Campos de examen (type='exam')
  passingScore?: number;
  questions?: {
    text: string;
    order?: number;
    relatedLessonId?: string;
    options: { text: string; isCorrect: boolean }[];
  }[];
}

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
    data: LessonData,
  ): Promise<Lesson>;

  abstract removeLesson(lessonId: string): Promise<void>;

  abstract findLesson(lessonId: string): Promise<Lesson | null>;

  abstract updateLesson(
    lessonId: string,
    data: LessonData,
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
