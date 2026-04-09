import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';
import { LessonType } from '@maris-nails/shared';
import { Course } from './course.entity';
import { QuizQuestion } from './quiz-question.entity';
import { VideoLesson } from './video-lesson.entity';
import { ExamLesson } from './exam-lesson.entity';
import { AssignmentLesson } from './assignment-lesson.entity';

/**
 * Lesson — Entidad BASE de toda lección.
 *
 * Solo contiene los campos comunes a TODOS los tipos de lección:
 * title, description, type, order.
 *
 * Los datos específicos de cada tipo viven en tablas hijas:
 *   - type='class' → VideoLesson (videoUrl, duration, isLive)
 *   - type='exam'  → ExamLesson (passingScore)
 *
 * Esto es Joined Table Inheritance:
 *   lessons ──1:1──> video_lessons   (si type='class')
 *   lessons ──1:1──> exam_lessons    (si type='exam')
 *
 * cascade: true  → al guardar una Lesson con videoData/examData,
 *                   TypeORM guarda la fila hija automáticamente.
 * eager: true    → al cargar una Lesson, TypeORM hace JOIN con
 *                   las tablas hijas y devuelve los datos completos.
 */
@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  // Discriminador: indica qué tabla hija tiene los datos específicos.
  // Default 'class' como string literal porque el CLI de TypeORM (CommonJS)
  // no resuelve los imports del shared package en runtime.
  @Column({ default: 'class' })
  type: LessonType;

  @Column({ default: 0 })
  order: number;

  // ── Relaciones a tablas hijas ────────────────────────────────────────
  // Solo una de las dos estará presente según el valor de `type`.

  @OneToOne(() => VideoLesson, (v) => v.lesson, { cascade: true, eager: true })
  videoData: VideoLesson;

  @OneToOne(() => ExamLesson, (e) => e.lesson, { cascade: true, eager: true })
  examData: ExamLesson;

  @OneToOne(() => AssignmentLesson, (a) => a.lesson, {
    cascade: true,
    eager: true,
  })
  assignmentData: AssignmentLesson;

  // ── Relaciones existentes ────────────────────────────────────────────

  // Las preguntas del quiz siguen referenciando la tabla lessons (no exam_lessons)
  // porque el FK quiz_questions.lessonId ya apunta aquí.
  @OneToMany(() => QuizQuestion, (q) => q.lesson, { cascade: true })
  questions: QuizQuestion[];

  @Index()
  @ManyToOne(() => Course, (course) => course.lessons, { onDelete: 'CASCADE' })
  course: Course;
}
