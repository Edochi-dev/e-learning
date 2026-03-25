import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Lesson as ILesson, LessonType } from '@maris-nails/shared';
import { Course } from './course.entity';
import { QuizQuestion } from './quiz-question.entity';

@Entity('lessons')
export class Lesson implements ILesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  // Discriminador de tipo: 'class' (video) o 'exam' (quiz).
  // Default 'class' para que las lecciones existentes en producción
  // no se rompan al correr la migración — simplemente obtienen type='class'.
  // Default 'class' como string literal porque el CLI de TypeORM (CommonJS)
  // no resuelve los imports del shared package en runtime.
  @Column({ default: 'class' })
  type: LessonType;

  @Column({ nullable: true })
  duration: string;

  // Ahora nullable porque las lecciones tipo 'exam' no tienen video.
  // Las lecciones existentes ya tienen valor, así que no pierden nada.
  @Column({ nullable: true })
  videoUrl: string;

  @Column({ default: 0 })
  order: number;

  @Column({ default: false })
  isLive: boolean;

  // Solo para tipo 'exam': cuántas respuestas correctas necesita el alumno para aprobar.
  @Column({ type: 'int', nullable: true })
  passingScore: number;

  // cascade: true → al guardar una Lesson con questions[], TypeORM
  // automáticamente guarda las QuizQuestion (y sus QuizOption por su propio cascade).
  @OneToMany(() => QuizQuestion, (q) => q.lesson, { cascade: true })
  questions: QuizQuestion[];

  @Index()
  @ManyToOne(() => Course, (course) => course.lessons, { onDelete: 'CASCADE' })
  course: Course;
}
