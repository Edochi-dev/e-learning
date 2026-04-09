import { Lesson } from '../entities/lessons.entity';

/**
 * QuestionData — Datos planos de una pregunta de quiz para el gateway.
 *
 * Extraído como tipo nombrado para no repetir la estructura inline
 * en cada variante de LessonData.
 */
export interface QuestionData {
  text: string;
  order?: number;
  relatedLessonId?: string;
  options: { text: string; isCorrect: boolean }[];
}

/**
 * LessonData — Unión discriminada para crear/actualizar lecciones.
 *
 * ¿Por qué una unión discriminada y no una interfaz plana con todo opcional?
 *
 * Porque la interfaz plana permite combinaciones imposibles:
 * podrías mandar { type: 'class', passingScore: 90 } y TypeScript no se queja.
 * Con la unión discriminada, el campo `type` determina EXACTAMENTE qué campos
 * son válidos. El compilador te protege de mezclar tipos.
 *
 * Es el mismo principio que Joined Table Inheritance en la base de datos:
 * cada tipo tiene sus propios campos, no comparte columnas nullable con otros.
 *
 * El repositorio sigue siendo quien sabe repartir los campos entre las tablas
 * hijas — pero ahora recibe datos cuya forma es verificada en compilación.
 */
interface ClassLessonData {
  type: 'class';
  title?: string;
  description?: string;
  videoUrl?: string;
  duration?: string;
  isLive?: boolean;
}

interface ExamLessonData {
  type: 'exam';
  title?: string;
  description?: string;
  passingScore?: number;
  questions?: QuestionData[];
}

interface CorrectionLessonData {
  type: 'correction';
  title?: string;
  description?: string;
  referenceImageUrl?: string;
  instructions?: string;
}

export type LessonData =
  | ClassLessonData
  | ExamLessonData
  | CorrectionLessonData;

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
  abstract addLesson(courseId: string, data: LessonData): Promise<Lesson>;

  abstract removeLesson(lessonId: string): Promise<void>;

  abstract findLesson(lessonId: string): Promise<Lesson | null>;

  abstract updateLesson(lessonId: string, data: LessonData): Promise<Lesson>;

  abstract reorderLessons(courseId: string, lessonIds: string[]): Promise<void>;

  abstract findLessonWithQuestions(lessonId: string): Promise<Lesson | null>;

  abstract isVideoUrlReferenced(
    videoUrl: string,
    excludeLessonId: string,
  ): Promise<boolean>;

  abstract isVideoUrlInUse(videoUrl: string): Promise<boolean>;
}
